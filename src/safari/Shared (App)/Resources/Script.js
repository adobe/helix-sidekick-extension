try {
    /* Local storage item IDs */
    var STORAGE_TOUR_TAKEN = 'tour-taken';
    var STORAGE_PREFS_OPENED = 'prefs-opened';

    function show(platform, enabled, useSettingsInsteadOfPreferences) {
        document.body.classList.add(`platform-${platform}`);
        
        if (useSettingsInsteadOfPreferences) {
            document.getElementsByClassName('platform-mac state-on')[0].innerText = "AEM Sidekick is currently enabled. You can disable it in the Extensions section of Safari Settings.";
            document.getElementsByClassName('platform-mac state-off')[0].innerText = "AEM Sidekick is currently disabled. You can enable it in the Extensions section of Safari Settings.";
            document.getElementsByClassName('platform-mac state-unknown')[0].innerText = "AEM Sidekick can be enabled or disabled in the Extensions section of Safari Settings.";
            document.getElementsByClassName('platform-mac open-preferences')[0].innerText = "Quit and Open Safari Settings…";
        }
        
        if (typeof enabled === "boolean") {
            document.body.classList.toggle(`state-on`, enabled);
            document.body.classList.toggle(`state-off`, !enabled);
        } else {
            document.body.classList.remove(`state-on`);
            document.body.classList.remove(`state-off`);
        }
    }
    
    function openPreferences() {
        localStorage.setItem(STORAGE_PREFS_OPENED, true);
        webkit.messageHandlers.controller.postMessage("open-preferences");
    }
    
    document.getElementById('open-prefs').addEventListener('click', openPreferences);
    
    if (localStorage.getItem(STORAGE_PREFS_OPENED)) {
        document.getElementById('open-prefs').classList.remove('accent');
    }

    /* Tour (iOS) */

    var TOUR_START_ID = 'tour-start';
    var TOUR_END_ID = 'tour-end';
    var TOUR_CAROUSEL_ID = 'tour';
    var TOUR_CLOSE_ID = 'tour-close';
    
    /**
     * Carousel Block
     *
     * This block adds carousel behaviour to a block. The default block markup will be
     * augmented and additional markup will be added to render the final presentation.
     *
     * Features:
     * - smooth scrolling
     * - mouse drag between slides
     * - next and previous button
     * - direct selection via dots
     * - active slide indicator
     * - accessibility
     *
     * @example Carousel markup
     * <div class="carousel">
     *   <div class="carousel-slide-container">
     *     <div class="carousel-slide">
     *       <div>content</div>
     *       <figure>
     *         <figcaption class="caption">content</figcaption>
     *       </figure>
     *     </div>
     *     ...
     *   </div>
     *   <div class="carousel-nav carousel-nav-prev"></div>
     *   <div class="carousel-nav carousel-nav-next"></div>
     *   <ul class="carousel-dots">
     *     <li><button/></li>
     *   </ul>
     * </div>
     */
    
    var SLIDE_CAPTION_SIZE = 64;
    var SLIDE_ID_PREFIX = 'carousel-slide';
    var SLIDE_CONTROL_ID_PREFIX = 'carousel-slide-control';
    
    var resizeTimeout;
    var scrollInterval;
    var curSlide = 0;
    var maxSlide = 0;
    var carouselType = 'default';
    
    
    /**
     * Count how many lines a block of text will consume when wrapped within a container
     * that has a maximum width.
     * @param text The full text
     * @param width Width of container
     * @param options Options to be applied to context (eg. font style)
     *
     * @return {number} The number of lines
     */
    function getLineCount(text, width, options = {}) {
        // re-use canvas object for better performance
        const canvas = getLineCount.canvas || (getLineCount.canvas = document.createElement('canvas'));
        const context = canvas.getContext('2d');
        Object.entries(options).forEach(([key, value]) => {
            if (key in context) {
                context[key] = value;
            }
        });
        const words = text.split(' ');
        let testLine = '';
        let lineCount = 1;
        words.forEach((w, index) => {
            testLine += `${w} `;
            const { width: testWidth } = context.measureText(testLine);
            if (testWidth > width && index > 0) {
                lineCount += 1;
                testLine = `${w} `;
            }
        });
        return lineCount;
    }
    
    /**
     * Keep active dot in sync with current slide
     * @param carousel The carousel
     * @param activeSlide {number} The active slide
     */
    function syncActiveDot(carousel, activeSlide) {
        carousel.querySelectorAll('ul.carousel-dots li').forEach((item, index) => {
            const btn = item.querySelector('button');
            if (index === activeSlide) {
                item.classList.add('carousel-dots-active');
                btn.setAttribute('aria-selected', 'true');
                btn.setAttribute('tabindex', '0');
            } else {
                item.classList.remove('carousel-dots-active');
                btn.removeAttribute('aria-selected');
                btn.setAttribute('tabindex', '-1');
            }
        });
    }
    
    /**
     * Scroll a single slide into view.
     *
     * @param carousel The carousel
     * @param slideIndex {number} The slide index
     */
    function scrollToSlide(carousel, slideIndex = 0) {
        const carouselSlider = carousel.querySelector('.carousel-slide-container');
        carouselSlider.scrollTo({ left: carouselSlider.offsetWidth * slideIndex, behavior: 'smooth' });
        syncActiveDot(carousel, slideIndex);
        // sync slide
        [...carouselSlider.children].forEach((slide, index) => {
            if (index === slideIndex) {
                slide.removeAttribute('tabindex');
                slide.setAttribute('aria-hidden', 'false');
            } else {
                slide.setAttribute('tabindex', '-1');
                slide.setAttribute('aria-hidden', 'true');
            }
        });
        curSlide = slideIndex;
    }
    
    /**
     * Based on the direction of a scroll snap the scroll position based on the
     * offset width of the scrollable element. The snap threshold is determined
     * by the direction of the scroll to ensure that snap direction is natural.
     *
     * @param el the scrollable element
     * @param dir the direction of the scroll
     */
    function snapScroll(el, dir = 1) {
        if (!el) {
            return;
        }
        let threshold = el.offsetWidth * 0.5;
        if (dir >= 0) {
            threshold -= (threshold * 0.5);
        } else {
            threshold += (threshold * 0.5);
        }
        const block = Math.floor(el.scrollLeft / el.offsetWidth);
        const pos = el.scrollLeft - (el.offsetWidth * block);
        const snapToBlock = pos <= threshold ? block : block + 1;
        const carousel = el.closest('.carousel');
        scrollToSlide(carousel, snapToBlock);
    }
    
    /**
     *
     * @param slides An array of slide elements within the carousel
     * @return {HTMLUListElement} The carousel dots element
     */
    function buildDots(slides = []) {
        const dots = document.createElement('ul');
        dots.classList.add('carousel-dots');
        dots.setAttribute('role', 'tablist');
        slides.forEach((slide, index) => {
            const dotItem = document.createElement('li');
            dotItem.setAttribute('role', 'presentation');
            if (index === 0) {
                dotItem.classList.add('carousel-dots-active');
            }
            const dotBtn = document.createElement('button');
            dotBtn.setAttribute('id', `${SLIDE_CONTROL_ID_PREFIX}${index}`);
            dotBtn.setAttribute('type', 'button');
            dotBtn.setAttribute('role', 'tab');
            dotBtn.setAttribute('aria-controls', `${SLIDE_ID_PREFIX}${index}`);
            if (index === 0) {
                dotBtn.setAttribute('aria-selected', 'true');
                dotBtn.setAttribute('tabindex', '0');
            } else {
                dotBtn.setAttribute('tabindex', '-1');
            }
            dotBtn.setAttribute('aria-label', `${index + 1} of ${slides.length}`);
            dotBtn.innerText = `${index + 1}`;
            dotItem.append(dotBtn);
            dotItem.addEventListener('click', (e) => {
                curSlide = index;
                const carousel = e.target.closest('.carousel');
                scrollToSlide(carousel, curSlide);
            });
            dots.append(dotItem);
        });
        
        return dots;
    }
    
    /**
     * Decorate a base slide element.
     *
     * @param slide A base block slide element
     * @param index The slide's position
     * @return {HTMLUListElement} A decorated carousel slide element
     */
    function buildSlide(slide, index) {
        slide.setAttribute('id', `${SLIDE_ID_PREFIX}${index}`);
        slide.setAttribute('data-slide-index', index);
        slide.classList.add('carousel-slide');
        slide.style.transform = `translateX(${index * 100}%)`;
        // accessibility
        slide.setAttribute('role', 'tabpanel');
        slide.setAttribute('aria-hidden', index === 0 ? 'false' : 'true');
        slide.setAttribute('aria-describedby', `${SLIDE_CONTROL_ID_PREFIX}${index}`);
        if (index !== 0) {
            slide.setAttribute('tabindex', '-1');
        }
        return slide;
    }
    
    /**
     * Decorate and transform a carousel block.
     *
     * @param block HTML block from Franklin
     */
    function decorate(block) {
        const carousel = document.createElement('div');
        carousel.classList.add('carousel-slide-container');
        
        // make carousel draggable
        let isDown = false;
        let startX = 0;
        let startScroll = 0;
        let prevScroll = 0;
        
        const dragStart = (e) => {
            isDown = true;
            startX = e.pageX - carousel.offsetLeft;
            startScroll = carousel.scrollLeft;
            prevScroll = startScroll;
        };
        
        const dragMove = (e) => {
            if (!isDown) {
                return;
            }
            e.preventDefault();
            const x = e.pageX - carousel.offsetLeft;
            const walk = (x - startX);
            carousel.scrollLeft = prevScroll - walk;
        };
        
        const dragStop = () => {
            if (isDown) {
                snapScroll(carousel, carousel.scrollLeft > startScroll ? 1 : -1);
            }
            isDown = false;
        };
        
        const dragCancel = () => {
            if (isDown) {
                snapScroll(carousel, carousel.scrollLeft > startScroll ? 1 : -1);
            }
            isDown = false;
        };
        
        carousel.addEventListener('mousedown', dragStart);
        carousel.addEventListener('touchstart', dragStart);
        
        carousel.addEventListener('mouseleave', dragCancel);
        carousel.addEventListener('touchcancel', dragCancel);
        
        carousel.addEventListener('mouseup', dragStop);
        carousel.addEventListener('touchend', dragStop);
        
        carousel.addEventListener('mousemove', dragMove);
        carousel.addEventListener('touchmove', dragMove);
        
        // process each slide
        const slides = [...block.children];
        maxSlide = slides.length - 1;
        slides.forEach((slide, index) => {
            carousel.appendChild(buildSlide(slide, index));
        });
        
        // add decorated carousel to block
        block.append(carousel);
        
        // add nav buttons and dots to block
        if (slides.length > 1) {
            block.append(buildDots(slides));
            syncActiveDot(block, 0);
        }
        
        window.addEventListener('resize', () => {
            // clear the timeout
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => calculateSlideHeight(carousel, slides[curSlide]), 500);
        });
    }
    
    function startTour({ target } = {}) {
        const tour = document.getElementById(TOUR_CAROUSEL_ID);
        const close = document.getElementById(TOUR_CLOSE_ID);
        tour.style.top = '0';
        close.style.top = '0';
        scrollToSlide(tour, 0);
        if (target) {
            target.classList.remove('accent');
        }
    }
    
    function endTour() {
        const tour = document.getElementById(TOUR_CAROUSEL_ID);
        const close = document.getElementById(TOUR_CLOSE_ID);
        tour.style.top = '-1000px';
        close.style.top = '-1000px';
        scrollToSlide(tour, 0);
        window.localStorage.setItem(STORAGE_TOUR_TAKEN, true);
    }
    
    if (!document.getElementById(TOUR_CAROUSEL_ID)) {
        document.getElementById(TOUR_START_ID).remove();
    } else {
        document.getElementById(TOUR_START_ID).addEventListener('click', startTour);
        document.getElementById(TOUR_END_ID).addEventListener('click', endTour);
        document.getElementById(TOUR_CLOSE_ID).addEventListener('click', endTour);
        if (localStorage.getItem(STORAGE_TOUR_TAKEN)) {
            document.getElementById(TOUR_START_ID).classList.remove('accent');
        }
        decorate(document.getElementById(TOUR_CAROUSEL_ID));
    }
} catch (e) {
    // debug info
    document.getElementById('error').textContent = e;
}
