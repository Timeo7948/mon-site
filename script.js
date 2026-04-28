// NAVBAR INDICATOR
const items = document.querySelectorAll("#nav li");
const indicator = document.getElementById("indicator");

function moveIndicator(element) {
    indicator.style.width = element.offsetWidth + "px";
    indicator.style.left = element.offsetLeft + "px";
}

const active = document.querySelector("#nav li.active");
if (active) moveIndicator(active);

items.forEach(item => {
    item.addEventListener("click", () => {
        document.querySelector("#nav li.active")?.classList.remove("active");
        item.classList.add("active");
        moveIndicator(item);
    });
});

// REVEAL ANIMATION
const reveals = document.querySelectorAll(".reveal");

function revealOnScroll() {
    reveals.forEach(el => {
        const top = el.getBoundingClientRect().top;
        if (top < window.innerHeight - 100) {
            el.classList.add("visible");
        }
    });
}

window.addEventListener("scroll", revealOnScroll);
revealOnScroll();