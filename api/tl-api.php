<?php
// TL.ly API - Firebase Auth + MySQL Videos with Firebase Storage

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Configuration de la base de données
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'tlly');
define('MAX_FILE_SIZE', 500 * 1024 * 1024); // 500 MB

// Connexion à la base de données
try {
    $pdo = new PDO(
        "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8",
        DB_USER,
        DB_PASS,
        array(PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION)
    );
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erreur de connexion à la base de données']);
    exit();
}

// Récupérer les données JSON ou POST
$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    $input = $_POST;
}
$action = $input['action'] ?? '';

// Traiter les actions
switch ($action) {
    case 'upload_video':
        handleUploadVideo();
        break;

    case 'get_videos':
        handleGetVideos();
        break;

    case 'toggle_like':
        handleToggleLike();
        break;

    case 'get_comments':
        handleGetComments();
        break;

    case 'add_comment':
        handleAddComment();
        break;

    case 'delete_video':
        handleDeleteVideo();
        break;

    default:
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Action inconnue']);
        break;
}

// Valider le Firebase token (vérification basique avec le UID)
function validateFirebaseUser() {
    global $input;
    $firebaseUid = $input['firebase_uid'] ?? '';
    $email = $input['email'] ?? '';

    if (empty($firebaseUid) || empty($email)) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Authentification requise']);
        exit();
    }

    return ['uid' => $firebaseUid, 'email' => $email];
}

// Uploader une vidéo
function handleUploadVideo() {
    global $pdo, $input;

    // Vérifier l'authentification
    $user = validateFirebaseUser();

    $title = trim($input['title'] ?? '');
    $description = trim($input['description'] ?? '');
    $videoUrl = trim($input['video_url'] ?? '');
    $storagePath = trim($input['storage_path'] ?? '');
    $fileSize = intval($input['file_size'] ?? 0);

    if (empty($title)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Le titre est requis']);
        exit();
    }

    if (empty($videoUrl) || empty($storagePath)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'URL de la vidéo requise']);
        exit();
    }

    if ($fileSize > MAX_FILE_SIZE) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Fichier trop volumineux (max 500 MB)']);
        exit();
    }

    try {
        $stmt = $pdo->prepare("
            INSERT INTO videos (firebase_uid, author_email, title, description, file_path, file_size, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
        ");
        $stmt->execute([$user['uid'], $user['email'], $title, $description, $videoUrl, $fileSize]);

        echo json_encode(['success' => true, 'message' => 'Vidéo uploadée avec succès']);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Erreur base de données']);
    }
}

// Récupérer les vidéos
function handleGetVideos() {
    global $pdo;

    // Vérifier l'authentification
    $user = validateFirebaseUser();

    try {
        $stmt = $pdo->prepare("
            SELECT
                v.*,
                CASE WHEN l.id IS NOT NULL THEN 1 ELSE 0 END as user_liked,
                COALESCE(lc.likes_count, 0) as likes_count,
                COALESCE(cc.comments_count, 0) as comments_count
            FROM videos v
            LEFT JOIN likes l ON v.id = l.video_id AND l.firebase_uid = ?
            LEFT JOIN (SELECT video_id, COUNT(*) as likes_count FROM likes GROUP BY video_id) lc ON v.id = lc.video_id
            LEFT JOIN (SELECT video_id, COUNT(*) as comments_count FROM comments GROUP BY video_id) cc ON v.id = cc.video_id
            ORDER BY v.created_at DESC
        ");
        $stmt->execute([$user['uid']]);
        $videos = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(['success' => true, 'videos' => $videos]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Erreur récupération vidéos']);
    }
}

// Activer/Désactiver like
function handleToggleLike() {
    global $pdo;

    // Vérifier l'authentification
    $user = validateFirebaseUser();

    $videoId = $input['video_id'] ?? 0;

    if (!$videoId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'ID vidéo requis']);
        exit();
    }

    try {
        // Vérifier si le like existe
        $stmt = $pdo->prepare("SELECT id FROM likes WHERE video_id = ? AND firebase_uid = ?");
        $stmt->execute([$videoId, $user['uid']]);
        $existing = $stmt->fetch();

        if ($existing) {
            // Supprimer le like
            $stmt = $pdo->prepare("DELETE FROM likes WHERE id = ?");
            $stmt->execute([$existing['id']]);
        } else {
            // Ajouter le like
            $stmt = $pdo->prepare("INSERT INTO likes (video_id, firebase_uid, user_email, created_at) VALUES (?, ?, ?, NOW())");
            $stmt->execute([$videoId, $user['uid'], $user['email']]);
        }

        echo json_encode(['success' => true]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Erreur like']);
    }
}

// Récupérer les commentaires
function handleGetComments() {
    global $pdo;

    $videoId = $input['video_id'] ?? 0;

    if (!$videoId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'ID vidéo requis']);
        exit();
    }

    try {
        $stmt = $pdo->prepare("SELECT * FROM comments WHERE video_id = ? ORDER BY created_at DESC");
        $stmt->execute([$videoId]);
        $comments = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(['success' => true, 'comments' => $comments]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Erreur récupération commentaires']);
    }
}

// Ajouter un commentaire
function handleAddComment() {
    global $pdo;

    // Vérifier l'authentification
    $user = validateFirebaseUser();

    $videoId = $input['video_id'] ?? 0;
    $text = trim($input['text'] ?? '');

    if (!$videoId || empty($text)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'ID vidéo et texte requis']);
        exit();
    }

    if (strlen($text) > 500) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Commentaire trop long']);
        exit();
    }

    try {
        $stmt = $pdo->prepare("INSERT INTO comments (video_id, firebase_uid, user_email, text, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())");
        $stmt->execute([$videoId, $user['uid'], $user['email'], $text]);

        echo json_encode(['success' => true]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Erreur ajout commentaire']);
    }
}

// Supprimer une vidéo
function handleDeleteVideo() {
    global $pdo;

    // Vérifier l'authentification
    $user = validateFirebaseUser();

    $videoId = $input['video_id'] ?? 0;

    if (!$videoId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'ID vidéo requis']);
        exit();
    }

    try {
        // Supprimer de la base (les likes et commentaires seront supprimés en cascade)
        $stmt = $pdo->prepare("DELETE FROM videos WHERE id = ? AND firebase_uid = ?");
        $stmt->execute([$videoId, $user['uid']]);

        echo json_encode(['success' => true]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Erreur suppression vidéo']);
    }
}r
?>