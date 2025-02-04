let narratives = []
let items = []

let currentNarrativeArr = []
let narrativeTitle = ""
let currentIdx = 0
let textState = 0
let rotation = 0

const navButtons = document.querySelectorAll(".back-button, .next-button")
const altNarrative = document.getElementById("alt-narr");
const artworksList = document.getElementById("artwork-list");
const smallImagecontainer = document.getElementById("side-image");
const mainImage = document.getElementById('artwork-img');
const sideImage = document.getElementById('artwork-img-2');
const textButtons = document.getElementById("button-container");
const lessButton = document.getElementById("less-button");
const moreButton = document.getElementById("more-button");
const text = document.getElementById("info-text");
const arrowSvg = document.querySelector(".scroll-button > svg")

document.addEventListener("DOMContentLoaded", async () => {
    const data = await fetch('data/data.json').then(response => response.json());
    items = data.items;
    narratives = data.narratives;
    if (window.location.href.includes("?")) {
        const urlObj = new URLSearchParams(window.location.search);
        narrativeTitle = urlObj.has("narr")? urlObj.get("narr").toString() : data.meta.defaultNarrative; 
        currentNarrativeArr = narratives[narrativeTitle]; 
        currentIdx = urlObj.has("id") ? currentNarrativeArr.indexOf(urlObj.get("id").toString()) : 0; 
    }
    else {
        narrativeTitle = data.meta.defaultNarrative
        currentNarrativeArr = narratives[narrativeTitle];
    };
    const itemData = items[currentNarrativeArr[currentIdx]];
    await setContent(itemData);
    await Promise.all([
        updateElements('.current-narrative', narrativeTitle), 
        setSidebarList(currentNarrativeArr, currentIdx)
    ]);
    mainImage.parentElement.scrollIntoView();
    await preloadNarrImages();
});


// UI STUFFS

async function setContent(data) {
    buttonsCheck();

    mainImage.classList.add("fade-out");
    await new Promise(resolve => setTimeout(resolve, 500));  // 0.5s matches CSS

    mainImage.src = sideImage.src = data.img;

    await Promise.all([
        updateElements('.current-artwork', data.title),
        updateElements('.table-data', el => data[el.id]),
        setNarrativeSwitch(data)
    ]);

    text.innerHTML = data.text.basic;
    textState = 0;
}

async function buttonsCheck () {
    navButtons.forEach((i) => {
        if (i.classList.contains("next-button")) {
            i.disabled = currentIdx === currentNarrativeArr.length - 1;
        }
        else {
            i.disabled = currentIdx === 0;
        }
    });
    lessButton.disabled = true;
    moreButton.disabled = false;
}

// update elements with new content
function updateElements(selector, content) {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
        el.innerHTML = typeof content === 'function' ? content(el) : content;
    });
}

async function preloadNarrImages() {
    const imgPromises = currentNarrativeArr.map((id) => {
        const imgUrl = items[id].img
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = imgUrl;
            img.onload = () => {
                resolve(img);
            };
            img.onerror = () => reject(new Error('Image failed to load'));
        });
    });

    try {
        const loadedImages = await Promise.all(imgPromises);
        console.log("All images preloaded successfully!");
        return loadedImages; // Return the array of loaded Image objects
    } 
    catch (error) {
        console.error(error);
    }
}

async function nextItem() {
    currentIdx += 1;
    await setContent(items[currentNarrativeArr[currentIdx]]);
    disableCurrSideItem(currentIdx);
}

async function prevItem() {
    currentIdx -= 1;
    await setContent(items[currentNarrativeArr[currentIdx]]);
    disableCurrSideItem(currentIdx);
}

async function setNarrativeSwitch(item) {
    // Clear the alt-narr divs
    document.querySelectorAll("#alt-narr div.sub-narr").forEach((i) => {
        i.innerHTML = "";
    });

    const itemNarratives = [...item.includedIn];

    if (narrativeTitle != "Timeline") {
        const idx = itemNarratives.indexOf(narrativeTitle);
        itemNarratives.splice(idx, 1);
    }
}

async function switchNarrative(narrative) {
    console.log(narrative)
    document.querySelectorAll('.current-narrative').forEach((el) => {
        el.textContent = narrative;
    });
    currentNarrativeArr = narratives[narrative];
    narrativeTitle = narrative;
    currentIdx = 0;
    showLoading();
    await Promise.all([updateElements('.current-narrative', narrativeTitle), setContent(items[currentNarrativeArr[0]]), setSidebarList()]);
    await preloadNarrImages();
}

async function setSidebarList(narrative = currentNarrativeArr) {
    artworksList.innerHTML = "";
    narrative.forEach((item, i) => {
        const listElement = document.createElement('button');
        listElement.classList.add("btn");
        listElement.value = i;
        listElement.innerHTML = items[item].title;
        artworksList.appendChild(listElement);
    });
    disableCurrSideItem(currentIdx);
}

function disableCurrSideItem(idx) {
    artworksList.querySelector('.disabled')?.classList.remove('disabled');
    artworksList.querySelector(`#artwork-list button:nth-child(${idx+1})`).classList.add('disabled');
}

// OBSERVER

const observerCallback = (entries) => {
    entries.forEach(entry => {
        
      if (!entry.isIntersecting) {
        smallImagecontainer.classList.remove('hidden');
        smallImagecontainer.classList.add('visible');
        arrowSvg.setAttribute("transform", `rotate(${rotation})`);
        rotation += 180;
      } else {
        smallImagecontainer.classList.remove('visible');
        smallImagecontainer.classList.add('hidden');
        arrowSvg.setAttribute("transform", `rotate(${rotation})`);
        rotation -= 180;
      }
    });
  };
  
const observer = new IntersectionObserver(observerCallback, {threshold: 0.1});
observer.observe(mainImage);



// EVENT LISTENERS

window.addEventListener("resize", () => {
    const offcanvasClasses = document.querySelector(".offcanvas").classList;
    if (offcanvasClasses.contains("show")) {
    offcanvasClasses.remove("show");
    document.querySelector(".offcanvas-backdrop").classList.remove("show");
    }
});


mainImage.addEventListener("load", () => {
    mainImage.classList.remove("fade-out");
    mainImage.classList.add("fade-in");
    setTimeout(() => {
        mainImage.classList.remove("fade-in");
    }, 500);
})

sideImage.addEventListener("click", (e) => {
    const button = e.target.closest(".next-button, .back-button");
    if (button) {
        showLoading();
    }
})

// NARRATIVE SWITCHING

altNarrative.addEventListener("click", async (e) => {
    const button = e.target.closest("button")
    if (button) {
        let narrative;
        if (e.target.innerText === "") {
            narrative = button.value;
        }
        else {
            narrative = button.textContent;
        };
        smallImagecontainer.classList.add('hidden');
        smallImagecontainer.classList.remove('visible');
        await new Promise(requestAnimationFrame);
        mainImage.parentElement.scrollIntoView({behavior : "smooth"});
        await new Promise(resolve => setTimeout(resolve, 600)); 
        await switchNarrative(narrative);
    };
});

document.getElementById("timeline-switch").addEventListener("click", async (e) => {
    smallImagecontainer.classList.add('hidden');
    smallImagecontainer.classList.remove('visible');
    await new Promise(requestAnimationFrame);
    mainImage.parentElement.scrollIntoView({behavior : "smooth"});
    await new Promise(resolve => setTimeout(resolve, 600)); 
    await switchNarrative("Timeline");
});

// TEXT SWITCHING

textButtons.addEventListener("click", async (e) => {
    const button = e.target.closest("button");
    if (button) {
        text.classList.add("fade-out");
        await new Promise(resolve => setTimeout(resolve, 500));
        text.innerHTML = ""
        let textType
        textState += +button.value
        console.log(textState)
        switch (textState) {
            case 1: 
                textType = "extended";
                lessButton.disabled = false;
                moreButton.disabled = false;
                break;
            case 2: 
                textType = "long";
                moreButton.disabled = true;
                document.getElementById('info-text').scrollIntoView()
                break;
            default: 
                textType = "basic";
                lessButton.disabled = true;
        };
        const item = currentNarrativeArr[currentIdx];
        text.innerHTML = items[item]["text"][textType];
        text.classList.remove("fade-out");
        text.classList.add("fade-in");
        setTimeout(() => {
            text.classList.remove("fade-in");
        }, 500);
        document.getElementById("description").scrollIntoView()
    }
});

// SCROLL ANIMATIONS

sideImage.addEventListener("click", (e) => {
    const card = e.target.closest("#side-image")
    if (card) {
        mainImage.parentElement.scrollIntoView({behavior : "smooth"});
    }
});

document.querySelector(".scroll-button").addEventListener("click", (e) => {
    if (smallImagecontainer.classList.contains("hidden")) {
        document.getElementById("info-box").scrollIntoView();    
    } else {
        mainImage.parentElement.scrollIntoView({behavior : "smooth"});
    };
    });

// OFFCANVAS BUTTONS
artworksList.addEventListener("click", async (e) => {
    if (e.target.tagName === "BUTTON") {
        currentIdx = +e.target.value;
        disableCurrSideItem(currentIdx);
        await setContent(items[currentNarrativeArr[currentIdx]]);
        const offcanvasClasses = document.querySelector(".offcanvas").classList;
        offcanvasClasses.remove("show");
        document.querySelector(".offcanvas-backdrop").classList.remove("show");
        mainImage.parentElement.scrollIntoView()
    }
})