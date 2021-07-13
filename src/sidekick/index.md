# Sidekick Bookmarklet

A [bookmarklet](https://en.wikipedia.org/wiki/Bookmarklet) (or favlet) is a bookmark stored in your browser. It uses JavaScript to add additional features. The Sidekick bookmarklet gives authors a toolbar with context-aware actions like Preview or Publish.

---
id: form
---

<label for="giturl">Repository URL:</label>
<input id="giturl" placeholder="https://github.com/....">
<input type="hidden" id="project">
<input type="hidden" id="hlx3">
<br>
<button onclick="run()">Generate Bookmarklet</button>

---
id: book
style: display:none
---

## Installation

Drag the Helix logo below to your browser's bookmark bar, or <a href="#" onclick="copy()">copy</a> its <b>Link Address</b> to add the bookmarklet manually. <span id="update" style="display:none">Then you can safely delete the previous version of this bookmarklet.</span>

<a id="bookmark" title="Sidekick" href="" onclick="return help(e)">
  <img src="./helix.svg" alt="Sidekick">
</a>

<style>

#bookmark {
  color: transparent;
  margin: 40px auto;
  display: block;
  width: 100px;
  height: 100px;
  padding: 20px;
  box-shadow: 0 0 10px 5px rgba(0, 0, 0, 0.2);
  border-radius: 50px;
}

.back {
  margin-top: 80px;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.back a::before {
  content: "< Back to ";
  padding-right: 8px;
  display: inline-block;
}

input#project {
  margin-bottom: 0.5rem;
}

input[type="checkbox"] {
  width: auto;
  display: inline;
}

label.small {
  font-size: 1.2rem;
}

div.advanced > div  {
  display: none;
}

@media (prefers-color-scheme: dark) {
  #bookmark {
    box-shadow: 0 0 10px 5px rgba(255, 255, 255, 0.2);
  }
}

</style>

<script>
  function copy() {
    const text = document.getElementById('bookmark').href;
    navigator.clipboard.writeText(text);
  }

  function help(e) {
    e.preventDefault();
    e.stopPropagation();
    alert('Instead of clicking the Helix logo, drag it to your browser\'s bookmark bar.');
    return false;
  }

  function run() {
    let giturl = document.getElementById('giturl').value;
    const project = document.getElementById('project').value;
    const hlx3 = document.getElementById('hlx3').value;
    if (!giturl) {
      alert('Repository URL is mandatory.');
      return;
    }
    giturl = new URL(giturl);
    const segs = giturl.pathname.substring(1).split('/');
    const owner = segs[0];
    const repo = segs[1];
    const ref = segs[3] || 'main';

    const config = {
      owner,
      repo,
      ref,
    };

    // bake hlx3 flag into bookmarklet
    if (hlx3) {
      config.hlx3 = true;
    }

    const bm=document.getElementById('bookmark');
    bm.href = [
      'javascript:',
      '/* ** Helix Sidekick Bookmarklet ** */',
      '(() => {',
        `const c=${JSON.stringify(config)};`,
        'const s=document.createElement(\'script\');',
        's.id=\'hlx-sk-app\';',
        `s.src='${window.location.origin}/tools/sidekick/app.js';`,
        's.dataset.config=JSON.stringify(c);',
        'if(document.getElementById(\'hlx-sk-app\')){',
          'document.getElementById(\'hlx-sk-app\').replaceWith(s);',
        '} else {',
          'document.head.append(s);',
        '}',
      '})();',
    ].join('');
    let title = 'Sidekick';
    if (project) {
      title = `${project} ${title}`;
    }
    bm.setAttribute('title', title);
    bm.firstElementChild.setAttribute('alt', title);
    document.getElementById('book').style.display = 'block';
  }

  function init() {
    let autorun = false;
    const params = new URLSearchParams(window.location.search);
    params.forEach((v,k) => {
      const field = document.getElementById(k);
      if (!field) return;
      field.type === 'checkbox' ? field.checked = (v === 'true') : field.value = v;
      autorun = true;
    });
    const from = params.has('from') && params.get('from');
    if (from) {
      const backLink = document.createElement('a');
      backLink.href = encodeURI(from);
      backLink.textContent = from;
      const wrapper = document.createElement('div');
      wrapper.className = 'back';
      wrapper.appendChild(backLink);
      document.getElementById('book').appendChild(wrapper);
      document.getElementById('update').style.display = 'unset';
    }
    if (autorun) {
      document.getElementById('form').style.display = 'none';
      run();
    }
  }

  init();
</script>
