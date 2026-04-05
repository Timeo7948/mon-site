const menuButton = document.getElementById("btn");
if (menuButton) {
    menuButton.addEventListener("click", () => {
        alert("test !");
    });
}

// Smooth scrolling for internal navigation links
const navLinks = document.querySelectorAll('a[href^="#"]');
navLinks.forEach(link => {
    link.addEventListener('click', event => {
        event.preventDefault();
        const target = document.querySelector(link.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

// IntersectionObserver pour l'animation fade-in au scroll
const revealElements = document.querySelectorAll('.reveal');
const observerOptions = {
    threshold: 0.2
};

const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

revealElements.forEach(element => {
    revealObserver.observe(element);
});

// Optionnel : animation de fond en boucle
const background = document.querySelector('.background-glow');
let glowAngle = 0;

function animateBackground() {
    glowAngle += 0.3;
    background.style.backgroundPosition = `${50 + Math.sin(glowAngle) * 10}% ${50 + Math.cos(glowAngle) * 10}%`;
    requestAnimationFrame(animateBackground);
}

animateBackground();