# Sidekick Bookmarklet

A [bookmarklet](https://en.wikipedia.org/wiki/Bookmarklet) (or favlet) is a bookmark stored in your browser. It uses JavaScript to add additional features. The Sidekick bookmarklet gives authors a toolbar with context-aware actions like Preview or Publish.

---
id: form
---

<label for="giturl">Repository URL:</label>
<input id="giturl" placeholder="https://github.com/....">
<label for="host">Production Hostname (optional): </label>
<input id="host">
<input id="byocdn" type="checkbox">
<label for="byocdn" class="small">3rd party CDN (optional)</label>
<br>
<label for="project">Project Name (optional): </label>
<input id="project">
<div class="advanced">
  <div>
    <input id="hlx3" type="checkbox">
    <label for="hlx3" class="small">Helix 3 project</label>
  </div>
</div>
<br>
<button onclick="run()">Generate Bookmarklet</button>

---
id: book
style: display:none
---

Drag the Helix logo below to your browser's bookmark bar, or <a href="#" onclick="copy()">copy</a> its <b>Link Address</b> to add the bookmarklet manually. <span id="update" style="display:none">Then you can safely delete the previous version of this bookmarklet.</span>

<a id="bookmark" title="Sidekick" href="">
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

input#host,
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

  function run() {
    let giturl = document.getElementById('giturl').value;
    const host = document.getElementById('host').value;
    const byocdn = document.getElementById('byocdn').checked;
    const project = document.getElementById('project').value;
    const hlx3 = document.getElementById('hlx3').checked;
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
      project,
      host,
      owner,
      repo,
      ref,
    };
    if (byocdn || /^www.*\.adobe\.com$/.test(host)) { // treat www*.adobe.com as byoCDN
      config.byocdn = true;
    }
    if (hlx3) {
      config.hlx3 = true;
    }

    const bm=document.getElementById('bookmark');
    bm.href = [
      'javascript:',
      '/* ** Helix Sidekick Bookmarklet ** */',
      '(() => {',
        'window.hlx=window.hlx||{};',
        `window.hlx.sidekickConfig=${JSON.stringify(config)};`,
        'if(!window.hlx.sidekick){',
          `document.head.appendChild(document.createElement("script")).src="${window.location.origin}/tools/sidekick/app.js";`,
        '}else{window.hlx.sidekick.loadContext().toggle();}',
      '})();',
    ].join('');
    if (project) {
      const title = `${project} Sidekick`;
      bm.setAttribute('title', title);
      bm.firstElementChild.setAttribute('alt', title);
    }
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
    if (params.has('from')) {
      const from = params.get('from');
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
