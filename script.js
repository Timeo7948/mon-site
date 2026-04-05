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

// Toggle Socials section visibility when nav link is clicked
const socialLink = document.getElementById('social-link');
const socialsSection = document.getElementById('socials');
if (socialLink && socialsSection) {
    socialLink.addEventListener('click', (e) => {
        e.preventDefault();
        const isNowVisible = socialsSection.classList.toggle('hidden') ? false : true;
        if (isNowVisible) {
            socialsSection.classList.add('visible');
            socialLink.setAttribute('aria-expanded', 'true');
            socialsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            socialsSection.classList.remove('visible');
            socialLink.setAttribute('aria-expanded', 'false');
            // keep hidden after transition
            setTimeout(() => socialsSection.classList.add('hidden'), 300);
        }
    });
}