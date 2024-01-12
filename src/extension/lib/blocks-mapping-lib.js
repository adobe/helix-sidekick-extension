//# sourceURL=blocks-mapping-lib.js
// (() => {
//   const xp = window.xp ?? {};

  window.xp = {};

  /**
   * classes
   */

  const UI_HTML = `
  <html>
    <body>
      <template id="my-element">
        <style>
        .xp-ui-content {
          margin: auto;
          width: fit-content;
          min-height: 49px;
          box-sizing: border-box;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 14px;
          position:fixed;
          left:400px;
          z-index:2999999999;
          backgroumd-color: #333;
        }
        .xp-ui-content ul {
          display: flex;
          list-style-type: none;
          margin: 0;
          padding: 0;
          overflow: hidden;
          background-color: #333;
          z-index: 100001;
        }
        .xp-ui-content li {
          float: left;
          color: white;
          display: block;
          text-align: center;
          padding: 8px 12px;
          text-decoration: none;
        }
        .xp-ui-content li:hover {
          cursor: pointer;
          background-color: #111;
        }
        .xp-ui-content li.disabled {
          background-color: #888;
          float: left;
          color: #555;
          display: block;
          text-align: center;
          padding: 8px 12px;
          text-decoration: none;
        }
        .xp-ui-content li.disabled:hover {
          cursor: unset;
          // background-color: #111;
        }
        .xp-overlays {
          position:absolute;
          left:0;
          top:0;
          z-index:90000;
          /*display:none;*/
        }
        .xp-overlay:hover {
            background-color: rgba(255, 0, 0, .1);
        }
        .xp-overlay-label {
          position: absolute;
          left: 0px;
          top: 0px;
          background-color: rgba(0, 255, 0, 0.8);
          color: black;
          padding-left: 4px;
          font-size: 18px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 2px;
        }
        </style>
        <ul>
          <li data-action="analyse" onclick="document.dispatchEvent(new CustomEvent('sm:Event', { detail: { type: 'analysePage'}}));">Analyse</li>
          <li data-action="ignore-select" onclick="document.dispatchEvent(new CustomEvent('sm:Event', { detail: { type: 'ignoreElement'}}));">Exclude Element</li>
          <li data-action="toggle-overlays" onclick="document.dispatchEvent(new CustomEvent('sm:Event', { detail: { type: 'toggleOverlays'}}));">Toggle Overlays</li>
          </ul>
          </template>
          </body>
          </html>
`;
          // <li data-action="predict" class="disabled" onclick="xp.ui.run(event);">Predict</li>

  class UI {
    constructor() {
      ready(() => {
        document.body.querySelector('.xp-ui')?.remove();

        // overlays
        const overlays = window.document.createElement('div');
        overlays.className = 'xp-overlays';
        overlays.innerHTML = `<style>
        .xp-overlays {
          position:absolute;
          left:0;
          top:0;
          z-index:999999;
          /*display:none;*/
        }
        .xp-overlay:hover {
            background-color: rgba(0, 0, 255, .1);
        }  
        </style>`;
        // document.body.prepend(overlays);

        const div = window.document.createElement('div');
        div.className = 'xp-ui';
        
        document.body.prepend(div);
        
        const shadow = div.attachShadow({ mode: "open" });

        const divUI = window.document.createElement('div');
        divUI.className = 'xp-ui-content';

        const parser = new DOMParser();
        const doc3 = parser.parseFromString(UI_HTML, "text/html");

        divUI.append(doc3.querySelector('template').content);
        shadow.append(overlays);
        shadow.append(divUI);

        const uiDiv = document.body.querySelector('.xp-ui');

        var observer = new MutationObserver(function(mutations) {
          mutations.forEach(function(mutation) {
            if (mutation.type === "attributes") {
              if (mutation.target.dataset.status === 'analysed') {
                [...document.body.querySelector('.xp-ui').shadowRoot.querySelectorAll('li')].forEach((li) => {
                  li.classList.remove('disabled');
                });
              }
              if (mutation.attributeName === 'style') {
                const uiDiv = mutation.target;
                const uiRect = mutation.target.getBoundingClientRect();
                if (uiDiv) {
                  if (uiRect.y > 0) {
                    uiDiv.style.position = 'relative';
                    uiDiv.style.top = `-${uiRect.y}px`;
                  } else {
                    uiDiv.style.position = 'absolute';
                    uiDiv.style.top = `0px`;
                  }
                }
              }
            }
          });
        });
        observer.observe(uiDiv, {
          attributes: true,
        });

        const uiRect = uiDiv.getBoundingClientRect();
        if (uiDiv) {
          if (uiRect.y > 0) {
            uiDiv.style.position = 'relative';
            uiDiv.style.top = `-${uiRect.y}px`;
          } else {
            uiDiv.style.position = 'absolute';
            uiDiv.style.top = `0px`;
          }
        }

        document.addEventListener('sm:Event', (event) => {
          switch (event.detail.type) {
            case 'toggleOverlays':
              UI.toggleOverlays();
              break;
            default:
              break;
          }
        });
      });
    };

    get div() {
      return document.querySelector('.xp-ui');
    };

    static overlaysDiv() {
      return document.querySelector('.xp-ui').shadowRoot.querySelector('.xp-overlays');
    };

    show() {
      if (this.div) this.div.style.display = 'block';
    };

    hide() {
      if (this.div) this.div.style.display = 'none';
    };

    isVisible() {
      return this.div?.style.display === 'block';
    };

    resetOverlays() {
      document.querySelector('.xp-ui').shadowRoot.querySelector('.xp-overlays').querySelectorAll('div').forEach((div) => div.remove());
    };

    static toggleOverlays(show = null) {
      const d = document.querySelector('.xp-ui').shadowRoot.querySelector('.xp-overlays');
      if (show !== null) {
        d.style.display = show === true ? 'block' : 'none';
      } else {
        d.style.display = d.style.display === 'block' ? 'none' : 'block';
      }
    };

    async run(event) {
      if (event.target.classList.contains('disabled')) {
        return;
      }

      const action = event.target.dataset.action
      console.log('run', action);

      switch (action) {
        case 'analyse':
          await BlocksMapping.analysePage();
          this.div.dataset.status = 'analysed';
          break;
        // case 'predict':
        //   xp.predictPage();
        //   break;
        case 'ignore-select':
          xp.selectElementToIgnore();
          break;
        case 'ignore-element':
          const boxId = event.target.dataset.boxId;
          if (boxId) {
            xp.ignoreElementForDection(boxId);
          }
          break;
        case 'toggle-overlays':
          UI.toggleOverlays();
          break;
      }
    };
  }

  class Color {
    constructor({ r, g, b, a = 1, name = '' }) {
      this.name = name;
      this.r = r;
      this.g = g;
      this.b = b;
      this.a = a;
    };

    toHex() {
      return rgbaToHex(this.r, this.g, this.b, this.a);
    };

    static fromRGBA(rgbaStr) {
      const rgba = rgbaStr.replace('rgba(', '').replace(')', '').split(',').map((v) => parseInt(v.trim()));
      return new Color({ r: rgba[0], g: rgba[1], b: rgba[2], a: rgba[3] });
    };

    toRGBA() {
      return `rgba(${this.r}, ${this.g}, ${this.b}, ${this.a})`;
    };

    withAlpha(a) {
      return new Color({
        ...this,
        a,
      });
    };

    static random(withAlpha = false) {
      const r = Math.round(Math.random() * 255);
      const g = Math.round(Math.random() * 255);
      const b = Math.round(Math.random() * 255);
      const a = withAlpha ? Math.random() : 1;
      return new Color({ name: `rand-${r}-${g}-${b}-${a}`, r, g, b, a });
    };

    static fromHex(hex) {
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      const a = parseInt(hex.substring(6, 8), 16);
      return new Color({ name: `hex-${r}-${g}-${b}-${a}`, r, g, b, a });
    };
  };

  class SectionPrediction {
    constructor({ sectionType, sectionFeatures, template, confidence, fingerPrint }) {
      this.sectionType = sectionType;
      this.sectionFeatures = sectionFeatures;
      this.template = template;
      this.confidence = confidence;
      this.fingerPrint = fingerPrint;
    };
  }

  const SECTION_TYPES = [
    {
      'name': 'header',
      predictFn: (box, idx, boxes, features) => {
        // const el = box.div;
        if (features.isFlagSet(SECTION_FEATURES.isFromRootBox) && idx === 0) {
          return true;
        }
        // if (el.closest('header') || el.querySelector('header')) {
        //   // sectionType = 'header';
        //   return true;
        // }    
        // if (checkElStackCSSClasses(el, 'header')) {
        //   // sectionType = 'header';
        //   return true;
        // }
        return false;
      },
      fingerPrintFn: (box, idx, boxes, features) => {
        const el = box.div;

        // get tag name of the element
        const tagName = el.tagName.toLowerCase();

        const fp = {
          selectors: {
            main: null,
            children: null,
          },
        };
        
        if (tagName.includes('header')) {
          fp.selectors.main = tagName;
        }
        else if (el.id?.toLowerCase().includes('header')) {
          fp.selectors.main = `#${el.id}`;
        }
        else if (el.classList?.toString().toLowerCase().includes('header')) {
          const headerClasses = [...el.classList].filter((c) => c.toLowerCase().includes('header'));
          fp.selectors.main = `.${headerClasses.join('.')}`;
        }

        return fp;
      }
    },
    {
      'name': 'footer',
      predictFn: (box, idx, boxes, features) => {
        // const el = box.div;
        if (features.isFlagSet(SECTION_FEATURES.isFromRootBox) && idx === boxes.length-1) {
          return true;
        }
        // if (el.closest('footer') || el.querySelector('footer')) {
        //   // sectionType = 'footer';
        //   return true;
        // }    
        // if (checkElStackCSSClasses(el, 'footer')) {
        //   // sectionType = 'footer';
        //   return true;
        // }
        return false;
      },
      fingerPrintFn: (box, idx, boxes, features) => {
        const el = box.div;

        // get tag name of the element
        const tagName = el.tagName.toLowerCase();

        const fp = {
          selectors: {
            main: null,
            children: null,
          },
        };

        fp.selectors.main = '';
        if (tagName.includes('footer')) {
          fp.selectors.main = tagName;
        }
        else if (el.id?.toLowerCase().includes('footer')) {
          fp.selectors.main = `#${el.id}`;
        }
        else if (el.classList?.toString().toLowerCase().includes('footer')) {
          const headerClasses = [...el.classList].filter((c) => c.toLowerCase().includes('footer'));
          fp.selectors.main = `.${headerClasses.join('.')}`;
        }

        return fp;
      }
    },
    // {
    //   'name': 'columns',
    //   predictFn: (box, idx, boxes, features) => {
    //     return features.isFlagSet(SECTION_FEATURES.isGridLayout) /*&&
    //     !features.isFlagSet(SECTION_FEATURES.hasMultipleRows);*/
    //   },
    // },
    {
      'name': 'carousel',
      predictFn: (box, idx, boxes, features) => {
        let sibEls = DOM.getNSiblingsElements(box.div, (n) => n >= 2);
        if (sibEls) {
          console.log('predict carousel');
          console.log(sibEls);

          const sameEls = {};
          sibEls.forEach((el) => {
            const elXPath = getXPath(el);
            const xpaths = [...el.querySelectorAll('div')].map((el) => getXPath(el).slice(elXPath.length));
            console.log(xpaths);
            const hash = hashCode(xpaths.join('\n'));
            console.log(hash);
            if (sameEls[hash]) {
              sameEls[hash].push(el);
            } else {
              sameEls[hash] = [el];
            }
          });

          const key = Object.keys(sameEls).filter((key) => sameEls[key].length > 1);          
          if (sameEls[key]) {
            let hasVisibleElements = false;
            let hasHiddenElements = false;
            sameEls[key].forEach((el) => {
              if (DOM.isVisible(el)) {
                hasVisibleElements = true;
              } else {
                hasHiddenElements = true;
              }
            });
            if (hasVisibleElements && hasHiddenElements) {
                return true;
            }
          }
          return false;
        }
        return false
      },
      fingerPrintFn: (box, idx, boxes, features) => {
        const el = box.div;

        // get tag name of the element
        const tagName = el.tagName.toLowerCase();

        const fp = {
          selectors: {
            main: null,
            children: null,
          },
        };

        fp.selectors.main = '';
        if (tagName.includes('carousel')) {
          fp.selectors.main = tagName;
        }
        else if (el.id?.toLowerCase().includes('carousel')) {
          fp.selectors.main = `#${el.id}`;
        }
        else if (el.classList?.toString().toLowerCase().includes('carousel')) {
          const headerClasses = [...el.classList].filter((c) => c.toLowerCase().includes('carousel'));
          fp.selectors.main = `.${headerClasses.join('.')}`;
        }

        return fp;
      }
    },
    {
      'name': 'hero',
      predictFn: (box, idx, boxes, features) => {
        return box.height <= window.innerHeight &&
        features.isFlagSet(SECTION_FEATURES.hasBackground) &&
        features.isFlagSet(SECTION_FEATURES.hasHeading) &&
        features.isFlagSet(SECTION_FEATURES.hasCallToAction);
      },
      fingerPrintFn: (box, idx, boxes, features) => {
        const el = box.div;

        // get tag name of the element
        const tagName = el.tagName.toLowerCase();

        const fp = {
          selectors: {
            main: null,
            children: null,
          },
        };
        
        fp.selectors.main = '';
        if (tagName.includes('hero')) {
          fp.selectors.main = tagName;
        }
        else if (el.id?.toLowerCase().includes('hero')) {
          fp.selectors.main = `#${el.id}`;
        }
        else if (el.classList?.toString().toLowerCase().includes('hero')) {
          const headerClasses = [...el.classList].filter((c) => c.toLowerCase().includes('hero'));
          fp.selectors.main = `.${headerClasses.join('.')}`;
        }

        return fp;
      }
    },
    // {
    //   'name': 'heading',
    //   predictFn: (box, idx, boxes, features) => {
    //     if (!features.isFlagSet(SECTION_FEATURES.hasHeading)) {
    //       return false;
    //     }

    //     const clone = box.div.cloneNode(true);
    //     clone.querySelectorAll('script, style, link, meta, noscript').forEach((el) => el.remove());
    //     console.groupCollapsed('heading');
    //     const h = sanitizeText(clone.querySelector('h1, h2, h3, h4, h5, h6')?.textContent);
    //     const t = sanitizeText(clone.textContent);
    //     console.log(h);
    //     console.log(t);
    //     console.groupEnd();

    //     return features.isFlagSet(SECTION_FEATURES.hasTexts) &&
    //     h === t &&
    //     features.isFlagSet(SECTION_FEATURES.hasHeading) &&
    //     !features.isFlagSet(SECTION_FEATURES.hasImages) &&
    //     !features.isFlagSet(SECTION_FEATURES.hasCallToAction) &&
    //     !features.isFlagSet(SECTION_FEATURES.hasBackground);
    //   },
    // },
    // {
    //   'name': 'text',
    //   predictFn: (box, idx, boxes, features) => {
    //     // simpler strategy: text content + no visual elements
    //     return (
    //       features.isFlagSet(SECTION_FEATURES.hasTexts) && 
    //       !features.isFlagSet(SECTION_FEATURES.hasImages) &&
    //       !features.isFlagSet(SECTION_FEATURES.hasBackground)
    //     );
    //   },
    // },
    // {
    //   'name': 'text+icons',
    //   predictFn: (box, idx, boxes, features) => {
    //     let onlyIcons = true;
    //     const testImages = [...box.div.querySelectorAll('img')].some((img) => {
    //       const rect = img.getBoundingClientRect();
    //       if (rect.width > 50 && rect.height > 50) {
    //         return true;
    //       }
    //       return false;
    //     });
    //     if (testImages) {
    //       onlyIcons = false;
    //     }

    //     const childrenOnlyTextLike = !box.children.some((child) => {
    //       console.log(child.prediction?.sectionType);
    //       if (!['heading', 'text', 'text+icons'].includes(child.prediction?.sectionType)) {
    //         return true;
    //       }
    //       return false;
    //     });
    //     console.log('childrenOnlyTextLike', childrenOnlyTextLike);

    //     // simpler strategy: text content + no visual elements
    //     return (
    //       !features.isFlagSet(SECTION_FEATURES.isGridLayout) && 
    //       childrenOnlyTextLike &&
    //       features.isFlagSet(SECTION_FEATURES.hasTexts) && 
    //       onlyIcons &&
    //       !features.isFlagSet(SECTION_FEATURES.hasBackground)
    //     );
    //   },
    // },
  ];

  function calculateSurfacePercentage(mainRect, innerRect) {
    // Calculate the intersection area
    const intersectionX = Math.max(0, Math.min(mainRect.x + mainRect.width, innerRect.x + innerRect.width) - Math.max(mainRect.x, innerRect.x));
    const intersectionY = Math.max(0, Math.min(mainRect.y + mainRect.height, innerRect.y + innerRect.height) - Math.max(mainRect.y, innerRect.y));
    const intersectionArea = intersectionX * intersectionY;
  
    // Calculate the area of the inner rectangle
    const innerArea = innerRect.width * innerRect.height;
  
    // Calculate the percentage
    const percentage = (intersectionArea / innerArea) * 100;
  
    return percentage;
  }

  export class Box {
    // constructor
    constructor(x, y, w, h, div, exclude = false) {
      this.id = crypto.randomUUID();
      this.x = Math.round(x);
      this.y = Math.round(y);
      this.width = Math.round(w);
      this.height = Math.round(h);
      this.div = div;
      this.children = [];
      this.prediction = null;
      this.layout = null;
      this.exclude = exclude;

      if (this.exclude) {
        this.prediction = new SectionPrediction({
          sectionType: 'ignore',
          sectionFeatures: null,
          template: null,
          confidence: 1,
          fingerPrint: this.computeFingerPrintForElementToExclude(div),
        });
      }
    };

    static fromDiv(div) {
      const rect = div.getBoundingClientRect();
      const offset = getOffset(div);
      return new Box(offset.left, offset.top, rect.width, rect.height, div);
    };
  
    computeFingerPrintForElementToExclude(el) {
      const fp = {
        selectors: {
          main: null,
          children: null,
        },
      };

      if (el.classList) {
        fp.selectors.main = `.${[...el.classList].filter((c) => !c.includes('.')).join('.')}`;
      }

      return fp;

    }
  
    // methods
    contains(box, strict = true) {
      if (strict) {
        return (box.x - box.width >= this.x - this.width &&
            box.x + box.width <= this.x + this.width &&
            box.y - box.height >= this.y - this.height &&
            box.y + box.height <= this.y + this.height);
      } else {
        // console.log(this, box);
        // console.log((box.x - this.x));
        // console.log((box.x + box.width - this.x + this.width));
        // console.log((box.y - this.y));
        // console.log((box.y + box.height - this.y + this.height) < 20);

        return calculateSurfacePercentage(this, box) > 75;

        // return (
        //   box.x - box.width >= this.x - this.width - 40 &&
        //   box.x + box.width <= this.x + this.width + 40 &&
        //   box.y - box.height >= this.y - this.height - 40 &&
        //   box.y + box.height <= this.y + this.height + 40
        // );

        // return (
        //   (box.x - this.x) > -50 &&
        //   ((box.x + box.width) - (this.x + this.width)) < 50 &&
        //   (box.y - this.y) > -50 &&
        //   ((box.y + box.height) - (this.y + this.height)) < 50
        // );
      }
    };

    intersects(range) {
      return !(range.x - range.width > this.x + this.width ||
          range.x + range.width < this.x - this.width ||
          range.y - range.height > this.y + this.height ||
          range.y + range.height < this.y - this.height);
    };

    isInside(box) {
      return (box.x - box.width <= this.x - this.width &&
          box.x + box.width >= this.x + this.width &&
          box.y - box.height <= this.y - this.height &&
          box.y + box.height >= this.y + this.height);
    };

    addChild(box) {
      this.children.push(box);
    };

    // get children() {
    //   return this._children;
    // };

    // setChildren(children) {
    //   this._children = children;
    // };

    isChild(box) {
      return this.children.some(this.isChild);
    };

    determineLayout() {
      // console.groupCollapsed('layout');
      // console.log('determineLayout -------------------------------------');
      // console.log('-----------------------------------------------------');
      // console.log('-----------------------------------------------------');

      const sortedBoxes = this.children.sort((a, b) => {
        if (a.y < b.y) {
          return -1;
        } if (a.y > b.y) {
          return 1;
        }
        return a.x - b.x;
      });
    
      // console.log('sortedBoxes', sortedBoxes);
      // console.log('sortedBoxes.length', sortedBoxes.length);
    
      let numRows = 1;
      let numCols = 1; // sortedPolygons.length;
      let prevBox = sortedBoxes[0];
      let colCounter = 1;
      for (let i = 1; i < sortedBoxes.length; i += 1) {
        const box = sortedBoxes[i];
        // console.log('====================================');
        // console.log('---');
        // console.log(prevBox.div);
        // console.log(prevBox);
        // console.log(box.div);
        // console.log(box);
        // console.log('---');
        if (box.y + 5 >= (prevBox.y + prevBox.height)) {
          numRows += 1;
    
          // console.log('---');
          // console.log('numRows++', numRows);
    
          numCols = Math.max(numCols, colCounter);
          colCounter = 1;
        }
        if (box.x + 5 >= (prevBox.x + prevBox.width)) {
          colCounter += 1;
    
          // console.log('---');
          // console.log('colCounter++', colCounter);
    
          // if (polygon.box.ymin >= prevBox.box.ymax) {
          // }
          // numCols = i;
          // break;
        }
        // console.log('====================================');
        prevBox = box;
      }

      numCols = Math.max(numCols, colCounter);

      // console.groupEnd();

      this.layout = { numRows, numCols };
      return this.layout;
    }
    
  }

  class DOM {
    // check element and all parents if they are visible
    static isVisible(el) {
      if (!el) {
        return false;
      }
      if (el.nodeType === Node.DOCUMENT_NODE) {
        return true;
      }
      if (el.nodeType === Node.ELEMENT_NODE) {
        const s = window.getComputedStyle(el);
        if (s.display.includes('none') || s.visibility.includes('hidden') || s.opacity === '0') {
          return false;
        }
        return DOM.isVisible(el.parentNode);
      }
      return DOM.isVisible(el.parentNode);
    }

    // courtesy of https://github.com/adobecom/aem-milo-migrations/blob/main/tools/importer/parsers/utils.js
    static getNSiblingsElements(el, n) {
      let cmpFn = n;
  
      if (!isNaN(n)) {
        cmpFn = (c) => c === n;
      }
  
      let selectedXpathPattern = '';
      const xpathGrouping = [];
  
      el.querySelectorAll('div').forEach(d => {
        const xpath = getXPath(d);
        const xp = xpath.substring(0, xpath.lastIndexOf('['));
        if (!xpathGrouping[xp]) {
          xpathGrouping[xp] = [d];
        } else {
          xpathGrouping[xp].push(d);
        }
      });
  
      // find the xpath pattern that has n elements
      for (let key in xpathGrouping) {
        if (cmpFn(xpathGrouping[key].length)) {
          selectedXpathPattern = key;
          break;
        }
      }
  
      return xpathGrouping[selectedXpathPattern];
    }

    static getPageSize() {
      var htmlElement = document.documentElement;
      var bodyElement = document.body;
      var width = Math.max(
        htmlElement.clientWidth, htmlElement.scrollWidth, htmlElement.offsetWidth,
        bodyElement.scrollWidth, bodyElement.offsetWidth
      );
      var height = Math.max(
        htmlElement.clientHeight, htmlElement.scrollHeight, htmlElement.offsetHeight,
        bodyElement.scrollHeight, bodyElement.offsetHeight
      );
      return { width, height };
    }
  
  }
  // xp.DOM = DOM;


  class Flags {
    constructor(...flags) {
      flags.reduce((acc, flagName, index) => {
        acc[flagName] = 1 << index;
        return acc;
      }, this);
    }
  }

  class FlagSet {
    #flag = 0
    constructor(...flags) {
      this.#flag = 0;
      this.setFlags(...flags);
    }

    get flag() {
      return this.#flag;
    }

    setFlags(...flags) {
      this.#flag = flags.reduce((acc, flag) => acc | flag, 0);
    }

    // Function to set a flag
    setFlag(flag) {
      this.#flag |= flag;
    }

    // Function to unset a flag
    unsetFlag(flag) {
      this.#flag &= ~flag;
    }

    // Function to check if a flag is set
    isFlagSet(flag) {
      return (this.#flag & flag) !== 0;
    }

    // Function to check if only the specified set of flags is set
    areOnlyFlagsSet(...flagValues) {
      const expectedFlags = flagValues.reduce((acc, flag) => acc | flag, 0);
      return this.#flag === expectedFlags;
    }

    getFlags(flagValues) {
      return Object.keys(flagValues).filter((flag) => this.isFlagSet(flagValues[flag]));
    }
  }

  // xp.Flags = Flags;
  // xp.FlagSet = FlagSet;


  /**
   * functions
   */

  // const MAX_DIV_SIZE = 350000;

  // Courtesy of https://github.com/catalan-adobe/franklin-bulk-shared/blob/main/src/puppeteer/puppeteer.ts
  async function autoScroll(page) {
    return new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 500;
      const timer = setInterval(() => {
        const { scrollHeight } = window.document.scrollingElement;
        totalHeight += distance;
        window.document.scrollingElement.scrollTo({ top: totalHeight, left: 0, behavior: 'instant' });
        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve(true);
        }
      }, 100);
    });
  }
  async function smartScroll(page, options = { postReset: true }) {
    try {
      // scroll to bottom
      await autoScroll(page);
  
      // pace
      await setTimeout(() => {}, 250);
  
      // scroll back up
      if (options.postReset) {
        window.document.scrollingElement.scrollTo({ left: 0, top: 0, behavior: 'instant' });
        await setTimeout(() => {}, 250);
      }
    } catch (e) {
      throw new Error(`smart scroll failed: ${e}`);
    }
  }
  

  // Courtesy of https://gist.github.com/hyamamoto/fd435505d29ebfa3d9716fd2be8d42f0
  /**
   * Returns a hash code for a string.
   * (Compatible to Java's String.hashCode())
   *
   * The hash code for a string object is computed as
   *     s[0]*31^(n-1) + s[1]*31^(n-2) + ... + s[n-1]
   * using number arithmetic, where s[i] is the i th character
   * of the given string, n is the length of the string,
   * and ^ indicates exponentiation.
   * (The hash value of the empty string is zero.)
   *
   * @param {string} s a string
   * @return {number} a hash code value for the given string.
   */
  function hashCode(s) {
    var h = 0, l = s.length, i = 0;
    if ( l > 0 )
      while (i < l)
        h = (h << 5) - h + s.charCodeAt(i++) | 0;
    return h;
  };


  function sanitizeText(text) {
    return text ? text.replaceAll('\n', ' ').replaceAll('\t', ' ').replaceAll(/\s+/g, ' ').trim() : '';
  }

  const COLORS = [
    new Color({ name: 'violet', r: 148, g: 0, b: 211 }),
    new Color({ name: 'indigo', r: 75, g: 0, b: 130 }),
    new Color({ name: 'blue', r: 0, g: 0, b: 255 }),
    new Color({ name: 'green', r: 0, g: 255, b: 0 }),
    new Color({ name: 'yellow', r: 255, g: 255, b: 0 }),
    new Color({ name: 'orange', r: 255, g: 127, b: 0 }),
    new Color({ name: 'red', r: 255, g: 0, b: 0 }),
  ];

  function getXPath(elm, withDetails = false) {
    var allNodes = document.getElementsByTagName('*');
    for (var segs = []; elm && elm.nodeType == 1; elm = elm.parentNode) {
      if (withDetails) {
        if (elm.hasAttribute('id')) {
          var uniqueIdCount = 0;
          for (var n=0;n < allNodes.length;n++) {
            if (allNodes[n].hasAttribute('id') && allNodes[n].id == elm.id) uniqueIdCount++;
            if (uniqueIdCount > 1) break;
          };
          if ( uniqueIdCount == 1) {
            segs.unshift('id("' + elm.getAttribute('id') + '")');
            return segs.join('/');
          } else {
            segs.unshift(elm.localName.toLowerCase() + '[@id="' + elm.getAttribute('id') + '"]');
          }
        } else if (elm.hasAttribute('class')) {
          segs.unshift(elm.localName.toLowerCase() + '[@class="' + [...elm.classList].join(" ").trim() + '"]');
        }
      } else {
        for (i = 1, sib = elm.previousSibling; sib; sib = sib.previousSibling) {
          if (sib.localName == elm.localName)  i++;
        }
        segs.unshift(elm.localName.toLowerCase() + '[' + i + ']');

      }
    }
    return segs.length ? '/' + segs.join('/') : null;
  };

  function ready(fn) {
    if (document.readyState !== 'loading') {
      fn();
      return;
    }
    document.addEventListener('DOMContentLoaded', fn);
  }

  function template(strings, ...keys) {
    return (...values) => {
      const dict = values[values.length - 1] || {};
      const result = [strings[0]];
      keys.forEach((key, i) => {
        const value = Number.isInteger(key) ? values[key] : dict[key];
        result.push(value, strings[i + 1]);
      });
      return result.join('');
    };
  }

  function valueToHex(c) {
    return c.toString(16);
  }

  function rgbaToHex(r, g, b, a) {
    return(valueToHex(r) + valueToHex(g) + valueToHex(b) + valueToHex(a));
  }

  function getOffset(el) {
    const rect = el.getBoundingClientRect();
    return {
      left: rect.left + window.document.scrollingElement.scrollLeft,
      top: rect.top + window.document.scrollingElement.scrollTop,
    };
  }

  function getOffsetRect(el) {
    const rect = el.getBoundingClientRect();
    return {
      x: rect.left + window.document.scrollingElement.scrollLeft,
      y: rect.top + window.document.scrollingElement.scrollTop,
      width: rect.width,
      height: rect.height,
    };
  }

  // xp.filterDivs = (divs) => {
  //   const d = divs.filter((div) => {
  //     const rect = div.getBoundingClientRect();
  //     const { width, height } = DOM.getPageSize();

  //     return  !div.classList.contains("xp-ui") &&
  //         !div.closest(".xp-ui") &&
  //         (rect.width !== 0 && rect.height !== 0) &&
  //         rect.width * rect.height > 10000 &&
  //         rect.width * rect.height < .8 * width * height &&
  //         DOM.isVisible(div)
  //   });

  //   console.log(d.length);
  //   console.log(d.map((div) => div));

  //   // return d;

  //   // filter out all divs which have a non visible parent
  //   // or which size is very close to the parent size
  //   // TODO - better handle parents which have width OR height === 0. The 0.80 check is not working in this case (X * 0 = 0)
  //   let d2 = d.filter((div) => {
  //     let parent = div.parentElement;
  //     while (parent) {
  //       const dRect = div.getBoundingClientRect();
  //       const pRect = parent.getBoundingClientRect();

  //       if (pRect.width === 0 || pRect.height === 0) {
  //         parent = parent.parentElement;
  //         continue;
  //       }

  //       if (dRect.width >= 0.90 * pRect.width && dRect.height >= 0.90 * pRect.height) {
  //         return false;
  //       }

  //       parent = parent.parentElement;
  //     }
  //     return true;
  //   });

  //   console.log(d2.length);
  //   console.log(d2.map((div) => div));

  //   return d2;
  // };

  const HIGHLIGHT_DIV_STYLE_TPL = template`position:absolute;left:${0}px;top:${1}px;width:${2}px;height:${3}px;border:2px solid ${4};z-index:9999`;

  const highlightBox = (box, padding = 0, color = null, label = null) => {
    let c = color || 'rgba(0, 0, 255, 1)';

    const rect = getOffsetRect(box.div);

    const d = document.createElement('div');
    d.dataset.boxId = box.id;
    d.className = 'xp-overlay';
    d.style = HIGHLIGHT_DIV_STYLE_TPL(rect.x+padding, rect.y+padding, rect.width-(padding*2)-4, rect.height-(padding*2)-4, c);

    if (label) {
      const l = document.createElement('div');
      l.className = 'xp-overlay-label';
      l.style = 'background-color: rgba(0, 255, 0, 0.8); color: black; padding-left: 4px; font-size: 18px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px;';
      l.textContent = label;
      d.appendChild(l);
    }

    UI.overlaysDiv().appendChild(d);
    // document.body.appendChild(d);
  };

  function highlightAllBoxes(root, padding = 0, color = null, colorLevel = 0) {
    root.children.forEach((box, idx) => {
      const c = color || COLORS[idx % (COLORS.length-1)];
      // console.log(c, box.div);
      const alpha = colorLevel === 0 ? 1 : Math.max(0.1, 0.5 - (colorLevel * 0.1));
      highlightBox(box, padding, c.withAlpha(alpha).toRGBA());
      if (box.children.length > 0) {
        highlightAllBoxes(box, padding+2, c, colorLevel+1);
      }
    });
  }

  function checkElStackCSSClasses(el, pattern, direction = 'up') {
    if (direction === 'up') {
      let parent = el;
      while(parent) {
        if (parent.classList.contains(pattern)) {
          return true;
        }
        parent = parent.parentElement;
      }
      return false;
    }
    return false;
  }

  const SECTION_FEATURES = new Flags(
    'isFromRootBox',
    'hasHeader',
    'hasTexts',
    'hasBackground',
    'hasHeading',
    'hasCallToAction',
    'hasImages',
    'hasMultipleColumns',
    'hasMultipleRows',
    'isGridLayout',
    // 'hasVideos',
    // 'hasForms',
    // 'hasTables',
    // 'hasLists',
  );

  function predictSection(box, idx, boxes, isRootBox = true) {
    if (box.ignored) {
      return null;
    }

    let sectionType = 'unknown';
    const sectionFeatures = new FlagSet();
    const el = box.div;

    /**
     * common checks
     */

    if (isRootBox) {
      sectionFeatures.setFlag(SECTION_FEATURES.isFromRootBox);
    }

    const clone = el.cloneNode(true);

    clone.querySelectorAll('script, style, link, meta, noscript').forEach((el) => el.remove());
    const hasTexts = clone.textContent.replaceAll(' ', '').replaceAll('\n', '').trim().length > 0;
    if (hasTexts) {
      sectionFeatures.setFlag(SECTION_FEATURES.hasTexts);
    }

    const hasImages = [...el.querySelectorAll('img, picture, svg')].length > 0 || ['IMG', 'PICTURE', 'SVG'].includes(el.nodeName);
    if (hasImages) {
      sectionFeatures.setFlag(SECTION_FEATURES.hasImages);
    }

    // background
    const hasBackground = extractBackground(box) ? true : false;
    if (hasBackground) {
      sectionFeatures.setFlag(SECTION_FEATURES.hasBackground);
    }

    // heading
    const hasHeading = [...el.querySelectorAll('h1, h2, h3, h4, h5, h6')].length > 0 || ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(el.nodeName);
    if (hasHeading) {
      sectionFeatures.setFlag(SECTION_FEATURES.hasHeading);
    }

    // call to action
    const hasCallToAction = [...el.querySelectorAll('a, button')].length > 0;
    if (hasCallToAction) {
      sectionFeatures.setFlag(SECTION_FEATURES.hasCallToAction);
    }

    // layout
    const layout = box.determineLayout();
    if (layout.numRows > 1) {
      sectionFeatures.setFlag(SECTION_FEATURES.hasMultipleRows);
    }
    if (layout.numCols > 1) {
      sectionFeatures.setFlag(SECTION_FEATURES.hasMultipleColumns);
    }
    if (layout.numCols > 1 && areBoxesLaidOutAsGrid(box.children)) {
      sectionFeatures.setFlag(SECTION_FEATURES.isGridLayout);
    }
    
    let children = box.children;
    children.forEach((...args) => {
      predictSection(...args, false);
    });
    
    let prediction = SECTION_TYPES.find((sectionType) => sectionType.predictFn(box, idx, boxes, sectionFeatures));

    if (prediction) {
      // finger print
      let fingerPrint = null;

      if (prediction.fingerPrintFn) {
        fingerPrint = prediction.fingerPrintFn(box, idx, boxes, sectionFeatures);
      }

      console.log('fingerPrint', fingerPrint);

      box.prediction = new SectionPrediction({
        sectionType: prediction.name,
        sectionFeatures,
        confidence: -1,
        fingerPrint,
      });
    } else {
      box.prediction = new SectionPrediction({
        sectionType: 'unknown',
        sectionFeatures,
        confidence: -1,
      });
    }      

    // console.group('prediction');
    console.log('prediction');
    console.log(sectionFeatures.getFlags(SECTION_FEATURES));
    console.log('layout:', layout);
    console.log(el);
    console.log('section prediction:', box.prediction);
    // console.groupEnd();
    
    
    
    // if (!isRootBox && children.length === 1 && children[0].children.length > 0) {
    //   children = children[0].children;  
    //   prediction = null;
    // }

    // if (
    //   !prediction ||
    //   (
    //     !isRootBox &&
    //     !['header', 'footer', 'text', 'text+icons'].includes(prediction['name']) &&
    //     sectionFeatures.isFlagSet(SECTION_FEATURES.hasMultipleRows) &&
    //     !sectionFeatures.isFlagSet(SECTION_FEATURES.hasMultipleColumns)
    //   )
    // ) {
    //   children.forEach((...args) => {
    //     const type = predictSection(...args, false);
    //   });
    // } else {
    //   console.warn(el);
    //   console.warn('section prediction:', prediction);
    //   if (prediction) {
    //     box.prediction = new SectionPrediction(prediction.name, sectionFeatures, -1);
    //   } else {
    //     box.prediction = new SectionPrediction('unknown', sectionFeatures, -1);
    //   }
    // }

    return sectionType;
  }

  function extractBackground(box) {
    const el = box.div;

    let bg = null;

    // css styles
    let foundEl = null;
    bg = [...el.querySelectorAll('*')].some((child) => {
      const s = window.getComputedStyle(child);
      const rect = child.getBoundingClientRect();
      const cssBGImage = s.backgroundImage || 'none';
      // do not check background color for now
      let cssBGColor = /*s.backgroundColor ||*/ 'none';

      // check if background color is transparent
      if (cssBGColor && cssBGColor.includes('rgba')) {
        const c = Color.fromRGBA(cssBGColor);
        if (c.a === 0) {
          cssBGColor = 'none';
        }
      }

      if (cssBGImage.includes('none') && cssBGColor.includes('none')) {
        return false;
      // } else if (cssBGImage?.trim()?.startsWith('linear-gradient')) {
      } else if (
        (cssBGImage || cssBGColor) &&
        rect.width > 0 && rect.height > 0 &&
        rect.width >= box.width * 0.8 && rect.height >= box.height * 0.8
      ) {
        foundEl = child;
        return true;
      }
    });
    if (bg) {
      return foundEl;
    }

    // image
    bg = [...el.querySelectorAll('img')].some((child) => {
      const rect = child.getBoundingClientRect();
      if (
        rect.width > 0 && rect.height > 0 &&
        rect.width >= box.width * 0.8 && rect.height >= box.height * 0.8
      ) {
        foundEl = child;
        return true;
      }
      return false;
    });
    if (bg) {
      return foundEl;
    }

    return bg;
  }

  function areBoxesLaidOutAsGrid(boxes) {
    console.log('areBoxesLaidOutAsGrid');
    try {
      if (boxes.length < 2) {
        // If there's only one box, it's not a grid
        return false;
      }
    
      // // Sort boxes based on their x and y coordinates
      // const sortedByX = boxes.slice().sort((a, b) => a.x - b.x || a.y - b.y);
      // const sortedByY = boxes.slice().sort((a, b) => a.y - b.y || a.x - b.x);
    
      // // Check horizontal alignment
      // const horizontalSpacing = sortedByX[1].x - sortedByX[0].x;
      // for (let i = 2; i < sortedByX.length; i++) {
      //   if (sortedByX[i].x - sortedByX[i - 1].x !== horizontalSpacing) {
      //     console.log('horizontalSpacing', horizontalSpacing);
      //     console.log(sortedByX);
      //     return false;
      //   }
      // }
    
      // // Check vertical alignment
      // const verticalSpacing = sortedByY[1].y - sortedByY[0].y;
      // for (let i = 2; i < sortedByY.length; i++) {
      //   if (sortedByY[i].y - sortedByY[i - 1].y !== verticalSpacing) {
      //     console.log('verticalSpacing', verticalSpacing);
      //     console.log(sortedByY);
      //     return false;
      //   }
      // }

          // Sort boxes based on their x and y coordinates
      const sortedByX = boxes.slice().sort((a, b) => a.x - b.x || a.y - b.y);
      const sortedByY = boxes.slice().sort((a, b) => a.y - b.y || a.x - b.x);

      console.log(sortedByX);
      console.log(sortedByY);

      // Check horizontal alignment
      const horizontalSpacing = [];
      for (let i = 1; i < sortedByX.length; i++) {
        horizontalSpacing.push(sortedByX[i].x - sortedByX[i - 1].x);
      }
      const uniqueHorizontalSpacings = [...new Set(horizontalSpacing)];
      if (uniqueHorizontalSpacings.length > 1) {
        return false;
      }

      // Check vertical alignment
      const verticalSpacing = [];
      for (let i = 1; i < sortedByY.length; i++) {
        verticalSpacing.push(sortedByY[i].y - sortedByY[i - 1].y);
      }
      const uniqueVerticalSpacings = [...new Set(verticalSpacing)];
      if (uniqueVerticalSpacings.length > 1) {
        return false;
      }

      return true;

    } finally {
      return true;
    }
  }



  //
  // main functions
  //

  // xp.getAllVisibleDivs = () => {
  //   // get all node types
  //   const types = [...document.body.querySelectorAll('*')].filter((el) => {
  //       return !['IFRAME', 'NOSCRIPT', 'BR', 'EM', 'STRONG', 'STYLE', 'SCRIPT'].includes(el.nodeName);
  //   }).reduce((acc, currValue, currIdx) => {
  //       // console.log(acc, currValue, currIdx);
  //       var cl = currValue.closest('svg');
  //       if (!(cl !== null && cl !== currValue) && !acc.includes(currValue.nodeName)) {
  //           acc.push(currValue.nodeName);
  //       }
  //       return acc;
  //   }, []);

  //   console.log('DOM node types:', types);
  //   // get all divs
  //   // const divs = [...document.querySelectorAll('div, main, header, footer')];
  //   const divs = [...document.querySelectorAll(types.join(','))];

  //   // filter divs
  //   const visibleDivs = xp.filterDivs(divs);
  //   // const visibleDivs = divs;

  //   // visibleDivs.forEach((div) => {
  //   //   console.log(getXPath(div, true));
  //   // });

  //   console.log(`found ${visibleDivs.length} visible divs to show!`);

  //   return visibleDivs;
  // }

  // main functions
  // xp.showAllVisibleDivs = (divs) => {
  //   const visibleDivs = divs || xp.getAllVisibleDivs();
  //   console.log(`found ${visibleDivs.length} visible divs to show!`);

  //   // hightlight all visible divs
  //   visibleDivs.forEach(highlightBox);
  // }

  // xp.buildBoxTree = (divs) => {
  //   const root = new Box(0, 0, window.innerWidth, window.document.scrollingElement.scrollHeight);

  //   const boxes = divs.map(Box.fromDiv);

  //   function builBoxesdHierarchy(parent, children, usedIndices) {
  //     children.forEach((child, index) => {
  //       if (usedIndices.has(index)) {
  //         return;
  //       }
  //       const ccc = parent.contains(child, false);
  //       // console.log(ccc);
  //       if (ccc) {
  //         const newParent = child;
  //         parent.addChild(newParent);
  //         usedIndices.add(index);
  //         builBoxesdHierarchy(newParent, children, usedIndices);
  //       }
  //     });
  //   }

  //   builBoxesdHierarchy(root, boxes, new Set());

  //   // compute layout for each box and children
  //   function computeLayout(box) {
  //     box.determineLayout();
  //     box.children.forEach(computeLayout);
  //   }
  //   computeLayout(root);

  //   // replace single child boxes by their own children
  //   function flattenHierarchy(box) {
  //     if (box.children.length === 1 && box.layout.numCols === 1) {
  //       const child = box.children[0];
  //       box.children = child.children;
  //       flattenHierarchy(box);
  //     } else {
  //       box.children.forEach(flattenHierarchy);
  //     }
  //   }
  //   flattenHierarchy(root);

  //   return root;
  // }

  // xp.getVerticalBoxesFromHierarchy = (boxes, keepDeepChildren = true) => {
  //   const root = {...boxes};
    
  //   function getVerticalBoxes(box) {
  //     const children = box.children;

  //     const hasHorizontalEls = children.some((child1) => {
  //       return children.some((child2) => {
  //         if (child1 !== child2 && !child1.isInside(child2) && 
  //           (child1.x >= child2.x+child2.width || child1.x+child1.width <= child2.x)
  //         ) {
  //           return true;
  //         }
  //         return false;
  //       });
  //     });

  //     // stop processing if there are horizontal elements
  //     if (hasHorizontalEls) {
  //       box.setChildren([]);
  //       // if (keepDeepChildren) {
  //       //   vBoxes.push(box);
  //       // } else {
  //       //   const clone = {...box};
  //       //   clone.children = [];
  //       //   vBoxes.push(clone);
  //       // }
  //       return;
  //     } else {
  //       for (let i = 0; i < children.length; i++) {
  //         getVerticalBoxes(children[i]);
  //       }
  //     }
  //   }

  //   getVerticalBoxes(root);

  //   return root.children;
  // };

  // xp.boxes = null;

  // xp.highlightVerticalBoxes = () => {
  //   const divs = xp.getAllVisibleDivs();

  //   const root = xp.buildBoxTree(divs);

  //   const verticalBoxes = xp.getVerticalBoxesFromHierarchy(root, false);

  //   const verticalBoxesRoot = new Box(0, 0, window.innerWidth, window.document.scrollingElement.scrollHeight);
  //   verticalBoxesRoot.setChildren(verticalBoxes);

  //   // console.log(verticalBoxesRoot);

  //   highlightAllBoxes(verticalBoxesRoot);
  // };

  // xp.analysePage = async() => {
  //   // reset UI
  //   xp.ui?.resetOverlays();

  //   // scroll down and up
  //   await smartScroll();

  //   const divs = xp.getAllVisibleDivs();

  //   xp.boxes = xp.buildBoxTree(divs);

  //   if (xp.ui) {
  //     highlightAllBoxes(xp.boxes);
  //   }

  //   console.log(xp.boxes);

  //   xp.ui?.toggleOverlays(true);

  //   return xp.boxes;
  // };

  // xp.predictPage = () => {
  //   if (xp.boxes?.children?.length > 0) {
  //     // reset UI
  //     xp.ui?.resetOverlays();

  //     xp.boxes.children.forEach((box, idx, boxes) => {
  //       predictSection(box, idx, boxes);
  //     });
      
  //     // console.log('finale boxes', xp.boxes);

  //     const finalBoxes = [];
      
  //     function displayPrediction(box) {
  //       if (!box.ignored) {
  //         if (
  //           (box.prediction && box.prediction.sectionType !== 'unknown') || 
  //           (box.prediction && box.prediction.sectionType === 'unknown' && box.children.length === 0)
  //         ) {
  //           finalBoxes.push(box);
  //           console.warn(box.div, box.prediction);
  //           if (xp.ui) {
  //             highlightBox(box, 0, 'rgba(0, 255, 0, 1)', box.prediction.sectionType);
  //           }
  //         } else {
  //           box.children.forEach(displayPrediction);
  //         }
  //       }
  //     }
  //     displayPrediction(xp.boxes);

  //     const template = xp.boxes.children.map((child) => {
  //       const tpl = [getXPath(child.div)];
  //       tpl.push(...child.children.map((c) => '- ' + getXPath(c.div)));
  //       return tpl.join('\n') || '';
  //     }).join('\n') || '';
  //     // console.log('template', template);
  //     console.log(xp.boxes)

  //     xp.boxes.template = {
  //       raw: template,
  //       hash: hashCode(template),
  //     };

  //     xp.ui?.toggleOverlays(true);

  //     return xp.boxes;

  //   }
  // };

  // xp.selectElementToIgnore = () => {
  //   document.body.style.cursor = 'crosshair';
  //   const target = xp.ui.overlaysDiv();
  //   target.addEventListener('click', (e) => {
  //     const el = e.target;
  //     if (el.classList.contains('xp-overlay')) {
  //       el.remove();
  //     }
  //     xp.ignoreElementForDection(el.dataset.boxId);
  //     document.body.style.removeProperty('cursor');
  //   },
  //   { once: true });
  // }

  // xp.ignoreElementForDection = (boxId) => {
  //   function findBox(box) {
  //     if (box.id === boxId) {
  //       box.ignored = true;
  //       // box.div.remove();
  //       // box.detection = null;
  //       // box.children = [];

  //       // remove all overlay divs which are children of this box
  //       function deleteOverlayDivs(box) {
  //         const target = xp.ui.overlaysDiv();
  //         [...target.querySelectorAll('.xp-overlay')].forEach((el) => {
  //           if (el.dataset.boxId === box.id) {
  //             el.remove();
  //           }
  //         });
  //         box.children.forEach(deleteOverlayDivs);
  //       }
  //       deleteOverlayDivs(box);

  //       return true;
  //     } else {
  //       return box.children.some(findBox);
  //     }
  //   }
  //   findBox(xp.boxes);
  // }

  
  // /**
  //  * init ui
  //  */

  // xp.ui = new UI();
  // xp.ui.show();
  
  // window.xp = xp;
// })(window);

buildBoxTree = (divs, window) => {
  const root = new Box(0, 0, window.innerWidth, window.document.scrollingElement.scrollHeight);

  const boxes = divs.map(Box.fromDiv);

  function builBoxesdHierarchy(parent, children, usedIndices) {
    children.forEach((child, index) => {
      if (usedIndices.has(index)) {
        return;
      }
      const ccc = parent.contains(child, false);
      // console.log(ccc);
      if (ccc) {
        const newParent = child;
        parent.addChild(newParent);
        usedIndices.add(index);
        builBoxesdHierarchy(newParent, children, usedIndices);
      }
    });
  }

  builBoxesdHierarchy(root, boxes, new Set());

  // compute layout for each box and children
  function computeLayout(box) {
    box.determineLayout();
    box.children.forEach(computeLayout);
  }
  computeLayout(root);

  // replace single child boxes by their own children
  function flattenHierarchy(box) {
    if (box.children.length === 1 && box.layout.numCols === 1) {
      const child = box.children[0];
      box.children = child.children;
      flattenHierarchy(box);
    } else {
      box.children.forEach(flattenHierarchy);
    }
  }
  flattenHierarchy(root);

  return root;
}

filterDivs = (divs) => {
  const d = divs.filter((div) => {
    const rect = div.getBoundingClientRect();
    const { width, height } = DOM.getPageSize();

    return  !div.classList.contains("xp-ui") &&
        !div.closest(".xp-ui") &&
        (rect.width !== 0 && rect.height !== 0) &&
        rect.width * rect.height > 10000 &&
        rect.width * rect.height < .8 * width * height &&
        DOM.isVisible(div)
  });

  console.log(d.length);
  console.log(d.map((div) => div));

  // return d;

  // filter out all divs which have a non visible parent
  // or which size is very close to the parent size
  // TODO - better handle parents which have width OR height === 0. The 0.80 check is not working in this case (X * 0 = 0)
  let d2 = d.filter((div) => {
    let parent = div.parentElement;
    while (parent) {
      const dRect = div.getBoundingClientRect();
      const pRect = parent.getBoundingClientRect();

      if (pRect.width === 0 || pRect.height === 0) {
        parent = parent.parentElement;
        continue;
      }

      if (dRect.width >= 0.90 * pRect.width && dRect.height >= 0.90 * pRect.height) {
        return false;
      }

      parent = parent.parentElement;
    }
    return true;
  });

  console.log(d2.length);
  console.log(d2.map((div) => div));

  return d2;
};

getAllVisibleDivs = (document) => {
  // get all node types
  const types = [...document.body.querySelectorAll('*')].filter((el) => {
      return !['IFRAME', 'NOSCRIPT', 'BR', 'EM', 'STRONG', 'STYLE', 'SCRIPT'].includes(el.nodeName);
  }).reduce((acc, currValue, currIdx) => {
      // console.log(acc, currValue, currIdx);
      var cl = currValue.closest('svg');
      if (!(cl !== null && cl !== currValue) && !acc.includes(currValue.nodeName)) {
          acc.push(currValue.nodeName);
      }
      return acc;
  }, []);

  console.log('DOM node types:', types);

  // get all divs
  const divs = [...document.querySelectorAll(types.join(','))];

  // filter divs
  const visibleDivs = filterDivs(divs);

  console.log(`found ${visibleDivs.length} visible divs to show!`);

  return visibleDivs;
}

predictPage = (boxes) => {
  if (boxes?.children?.length > 0) {
    // // reset UI
    // ui?.resetOverlays();

    boxes.children.forEach((box, idx, boxes) => {
      predictSection(box, idx, boxes);
    });
    
    // console.log('finale boxes', xp.boxes);

    const finalBoxes = [];
    
    function displayPrediction(box) {
      if (!box.ignored) {
        if (
          (box.prediction && box.prediction.sectionType !== 'unknown') /*|| 
          (box.prediction && box.prediction.sectionType === 'unknown' && box.children.length === 0)*/
        ) {
          finalBoxes.push(box);
          console.warn(box.div, box.prediction);
          // if (xp.ui) {
            highlightBox(box, 0, 'rgba(0, 255, 0, 1)', box.prediction.sectionType);
          // }
        } else {
          box.children.forEach(displayPrediction);
        }
      }
    }
    displayPrediction(boxes);

    const template = boxes.children.map((child) => {
      const tpl = [getXPath(child.div)];
      tpl.push(...child.children.map((c) => '- ' + getXPath(c.div)));
      return tpl.join('\n') || '';
    }).join('\n') || '';
    // console.log('template', template);
    console.log(boxes)

    boxes.template = {
      raw: template,
      hash: hashCode(template),
    };

    // xp.ui?.toggleOverlays(true);

    return boxes;
  }
};

export class BlocksMapping {
  static initUI() {
  }
  
  static analysePage = async(window) => {
    // // scroll down and up
    // await smartScroll();
    
    const divs = getAllVisibleDivs(window.document);
    
    const boxes = buildBoxTree(divs, window);
    
    const detectedBoxes = predictPage(boxes);
    
    // highlightAllBoxes(detectedBoxes);
    
    console.log(detectedBoxes);
    
    return detectedBoxes;
  };
}

if (!xp.ui) {
  xp.ui = new UI();
  xp.ui.show();
}
