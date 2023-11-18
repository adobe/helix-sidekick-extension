## Classes

<dl>
<dt><a href="#Sidekick">Sidekick</a> ⇐ <code>HTMLElement</code></dt>
<dd><p>The sidekick provides helper tools for authors.</p>
</dd>
</dl>

## Typedefs

<dl>
<dt><a href="#Plugin">Plugin</a> : <code>Object</code></dt>
<dd><p>The plugin configuration.</p>
</dd>
<dt><a href="#ViewConfig">ViewConfig</a> : <code>Object</code></dt>
<dd><p>A custom view configuration.</p>
</dd>
<dt><a href="#HelpStep">HelpStep</a> : <code>Object</code></dt>
<dd><p>The definition of a help step inside a <a href="#HelpTopic">help topic</a>.</p>
</dd>
<dt><a href="#HelpTopic">HelpTopic</a> : <code>Object</code></dt>
<dd><p>The definition of a help topic.</p>
</dd>
<dt><a href="#SidekickConfig">SidekickConfig</a> : <code>Object</code></dt>
<dd><p>The sidekick configuration.</p>
</dd>
</dl>

## External

<dl>
<dt><a href="#external_window.hlx.sidekickConfig">window.hlx.sidekickConfig</a> : <code><a href="#SidekickConfig">SidekickConfig</a></code></dt>
<dd><p>The global variable holding the initial sidekick configuration.</p>
</dd>
<dt><a href="#external_window.hlx.sidekick">window.hlx.sidekick</a> : <code><a href="#Sidekick">Sidekick</a></code></dt>
<dd><p>The global variable referencing the <a href="#Sidekick">Sidekick</a> singleton.</p>
</dd>
<dt><a href="#external_window.hlx.sidekickScript">window.hlx.sidekickScript</a> : <code>Element</code></dt>
<dd><p>The <code>script</code> element which loaded the sidekick module.</p>
</dd>
<dt><a href="#external_window.hlx.initSidekick">window.hlx.initSidekick</a> ⇒ <code><a href="#Sidekick">Sidekick</a></code></dt>
<dd><p>Initializes the sidekick and stores a reference to it in
             <a href="window.hlx.sidekick">window.hlx.sidekick</a>.</p>
</dd>
</dl>

<a name="Sidekick"></a>

## Sidekick ⇐ <code>HTMLElement</code>
The sidekick provides helper tools for authors.

**Kind**: global class  
**Extends**: <code>HTMLElement</code>  

* [Sidekick](#Sidekick) ⇐ <code>HTMLElement</code>
    * [new Sidekick(cfg)](#new_Sidekick_new)
    * [.fetchStatus(refreshLocation)](#Sidekick+fetchStatus) ⇒ [<code>Sidekick</code>](#Sidekick)
    * [.loadContext(cfg)](#Sidekick+loadContext) ⇒ [<code>Sidekick</code>](#Sidekick)
    * [.checkPushDownContent()](#Sidekick+checkPushDownContent) ⇒ [<code>Sidekick</code>](#Sidekick)
    * [.show()](#Sidekick+show) ⇒ [<code>Sidekick</code>](#Sidekick)
    * [.hide()](#Sidekick+hide) ⇒ [<code>Sidekick</code>](#Sidekick)
    * [.toggle()](#Sidekick+toggle) ⇒ [<code>Sidekick</code>](#Sidekick)
    * [.add(plugin)](#Sidekick+add) ⇒ <code>HTMLElement</code>
    * [.get(id)](#Sidekick+get) ⇒ <code>HTMLElement</code>
    * [.remove(id)](#Sidekick+remove) ⇒ [<code>Sidekick</code>](#Sidekick)
    * [.isEditor()](#Sidekick+isEditor) ⇒ <code>boolean</code>
    * [.isAdmin()](#Sidekick+isAdmin) ⇒ <code>boolean</code>
    * [.isDev()](#Sidekick+isDev) ⇒ <code>boolean</code>
    * [.isInner()](#Sidekick+isInner) ⇒ <code>boolean</code>
    * [.isOuter()](#Sidekick+isOuter) ⇒ <code>boolean</code>
    * [.isProd()](#Sidekick+isProd) ⇒ <code>boolean</code>
    * [.isProject()](#Sidekick+isProject) ⇒ <code>boolean</code>
    * ~~[.isHelix()](#Sidekick+isHelix) ⇒ <code>boolean</code>~~
    * [.isContent()](#Sidekick+isContent) ⇒ <code>boolean</code>
    * [.isAuthenticated()](#Sidekick+isAuthenticated) ⇒ <code>boolean</code>
    * [.isAuthorized(feature, permission)](#Sidekick+isAuthorized) ⇒ <code>boolean</code>
    * ~~[.notify(message, level)](#Sidekick+notify)~~
    * [.showWait()](#Sidekick+showWait)
    * [.showModal(msg, sticky, level, callback)](#Sidekick+showModal) ⇒ [<code>Sidekick</code>](#Sidekick)
    * [.hideModal()](#Sidekick+hideModal) ⇒ [<code>Sidekick</code>](#Sidekick)
    * [.showHelp(topic, step)](#Sidekick+showHelp) ⇒ [<code>Sidekick</code>](#Sidekick)
    * [.loadCSS(path)](#Sidekick+loadCSS) ⇒ [<code>Sidekick</code>](#Sidekick)
    * [.switchEnv(targetEnv, open)](#Sidekick+switchEnv) ⇒ [<code>Sidekick</code>](#Sidekick)
    * [.update()](#Sidekick+update) ⇒ <code>Response</code>
    * [.delete()](#Sidekick+delete) ⇒ <code>Response</code>
    * [.publish(path)](#Sidekick+publish) ⇒ <code>Response</code>
    * [.unpublish()](#Sidekick+unpublish) ⇒ <code>Response</code>
    * ["shown" (e)](#Sidekick+event_shown)
    * ["hidden" (e)](#Sidekick+event_hidden)
    * ["pluginused" (e)](#Sidekick+event_pluginused)
    * ["contextloaded" (e)](#Sidekick+event_contextloaded)
    * ["statusfetched" (e)](#Sidekick+event_statusfetched)
    * ["envswitched" (e)](#Sidekick+event_envswitched)
    * ["updated" (e)](#Sidekick+event_updated)
    * ["deleted" (e)](#Sidekick+event_deleted)
    * ["published" (e)](#Sidekick+event_published)
    * ["unpublished" (e)](#Sidekick+event_unpublished)
    * ["loggedin" (e)](#Sidekick+event_loggedin)
    * ["loggedout" (e)](#Sidekick+event_loggedout)
    * ["helpnext" (e)](#Sidekick+event_helpnext)
    * ["helpdismissed" (e)](#Sidekick+event_helpdismissed)
    * ["helpacknowledged" (e)](#Sidekick+event_helpacknowledged)
    * ["helpoptedout" (e)](#Sidekick+event_helpoptedout)

<a name="new_Sidekick_new"></a>

### new Sidekick(cfg)
Creates a new sidekick.


| Param | Type | Description |
| --- | --- | --- |
| cfg | [<code>SidekickConfig</code>](#SidekickConfig) | The sidekick config |

<a name="Sidekick+fetchStatus"></a>

### sidekick.fetchStatus(refreshLocation) ⇒ [<code>Sidekick</code>](#Sidekick)
Fetches the status for the current resource.

**Kind**: instance method of [<code>Sidekick</code>](#Sidekick)  
**Returns**: [<code>Sidekick</code>](#Sidekick) - The sidekick  
**Emits**: [<code>statusfetched</code>](#Sidekick+event_statusfetched)  

| Param | Type | Description |
| --- | --- | --- |
| refreshLocation | <code>boolean</code> | Refresh the sidekick's location (optional) |

<a name="Sidekick+loadContext"></a>

### sidekick.loadContext(cfg) ⇒ [<code>Sidekick</code>](#Sidekick)
Loads the sidekick configuration and language dictionary,
and retrieves the location of the current document.

**Kind**: instance method of [<code>Sidekick</code>](#Sidekick)  
**Returns**: [<code>Sidekick</code>](#Sidekick) - The sidekick  
**Emits**: [<code>contextloaded</code>](#Sidekick+event_contextloaded)  

| Param | Type | Description |
| --- | --- | --- |
| cfg | [<code>SidekickConfig</code>](#SidekickConfig) | The sidekick config |

<a name="Sidekick+checkPushDownContent"></a>

### sidekick.checkPushDownContent() ⇒ [<code>Sidekick</code>](#Sidekick)
Recalculates the height of the sidekick and pushes down the
page content by that amount to make room for the sidekick.

**Kind**: instance method of [<code>Sidekick</code>](#Sidekick)  
**Returns**: [<code>Sidekick</code>](#Sidekick) - The sidekick  
**See**: SidekickConfig.pushDown  
<a name="Sidekick+show"></a>

### sidekick.show() ⇒ [<code>Sidekick</code>](#Sidekick)
Shows the sidekick.

**Kind**: instance method of [<code>Sidekick</code>](#Sidekick)  
**Returns**: [<code>Sidekick</code>](#Sidekick) - The sidekick  
**Emits**: [<code>shown</code>](#Sidekick+event_shown)  
<a name="Sidekick+hide"></a>

### sidekick.hide() ⇒ [<code>Sidekick</code>](#Sidekick)
Hides the sidekick.

**Kind**: instance method of [<code>Sidekick</code>](#Sidekick)  
**Returns**: [<code>Sidekick</code>](#Sidekick) - The sidekick  
**Emits**: [<code>hidden</code>](#Sidekick+event_hidden)  
<a name="Sidekick+toggle"></a>

### sidekick.toggle() ⇒ [<code>Sidekick</code>](#Sidekick)
Shows/hides the sidekick.

**Kind**: instance method of [<code>Sidekick</code>](#Sidekick)  
**Returns**: [<code>Sidekick</code>](#Sidekick) - The sidekick  
<a name="Sidekick+add"></a>

### sidekick.add(plugin) ⇒ <code>HTMLElement</code>
Adds a plugin to the sidekick.

**Kind**: instance method of [<code>Sidekick</code>](#Sidekick)  
**Returns**: <code>HTMLElement</code> - The plugin  

| Param | Type | Description |
| --- | --- | --- |
| plugin | <code>\_plugin</code> | The plugin configuration. |

<a name="Sidekick+get"></a>

### sidekick.get(id) ⇒ <code>HTMLElement</code>
Returns the sidekick plugin with the specified ID.

**Kind**: instance method of [<code>Sidekick</code>](#Sidekick)  
**Returns**: <code>HTMLElement</code> - The plugin  

| Param | Type | Description |
| --- | --- | --- |
| id | <code>string</code> | The plugin ID |

<a name="Sidekick+remove"></a>

### sidekick.remove(id) ⇒ [<code>Sidekick</code>](#Sidekick)
Removes the plugin with the specified ID from the sidekick.

**Kind**: instance method of [<code>Sidekick</code>](#Sidekick)  
**Returns**: [<code>Sidekick</code>](#Sidekick) - The sidekick  

| Param | Type | Description |
| --- | --- | --- |
| id | <code>string</code> | The plugin ID |

<a name="Sidekick+isEditor"></a>

### sidekick.isEditor() ⇒ <code>boolean</code>
Checks if the current location is an editor URL (SharePoint or Google Docs).

**Kind**: instance method of [<code>Sidekick</code>](#Sidekick)  
**Returns**: <code>boolean</code> - <code>true</code> if editor URL, else <code>false</code>  
<a name="Sidekick+isAdmin"></a>

### sidekick.isAdmin() ⇒ <code>boolean</code>
Checks if the current location is an admin URL (SharePoint or Google Drive).

**Kind**: instance method of [<code>Sidekick</code>](#Sidekick)  
**Returns**: <code>boolean</code> - <code>true</code> if admin URL, else <code>false</code>  
<a name="Sidekick+isDev"></a>

### sidekick.isDev() ⇒ <code>boolean</code>
Checks if the current location is a development URL.

**Kind**: instance method of [<code>Sidekick</code>](#Sidekick)  
**Returns**: <code>boolean</code> - <code>true</code> if development URL, else <code>false</code>  
<a name="Sidekick+isInner"></a>

### sidekick.isInner() ⇒ <code>boolean</code>
Checks if the current location is an inner CDN URL.

**Kind**: instance method of [<code>Sidekick</code>](#Sidekick)  
**Returns**: <code>boolean</code> - <code>true</code> if inner CDN URL, else <code>false</code>  
<a name="Sidekick+isOuter"></a>

### sidekick.isOuter() ⇒ <code>boolean</code>
Checks if the current location is an outer CDN URL.

**Kind**: instance method of [<code>Sidekick</code>](#Sidekick)  
**Returns**: <code>boolean</code> - <code>true</code> if outer CDN URL, else <code>false</code>  
<a name="Sidekick+isProd"></a>

### sidekick.isProd() ⇒ <code>boolean</code>
Checks if the current location is a production URL.

**Kind**: instance method of [<code>Sidekick</code>](#Sidekick)  
**Returns**: <code>boolean</code> - <code>true</code> if production URL, else <code>false</code>  
<a name="Sidekick+isProject"></a>

### sidekick.isProject() ⇒ <code>boolean</code>
Checks if the current location is a configured project URL.

**Kind**: instance method of [<code>Sidekick</code>](#Sidekick)  
**Returns**: <code>boolean</code> - <code>true</code> if project URL, else <code>false</code>  
<a name="Sidekick+isHelix"></a>

### ~~sidekick.isHelix() ⇒ <code>boolean</code>~~
***Deprecated***

Checks if the current location is a configured project URL.

**Kind**: instance method of [<code>Sidekick</code>](#Sidekick)  
**Returns**: <code>boolean</code> - <code>true</code> if project URL, else <code>false</code>  
**See**: isProject  
<a name="Sidekick+isContent"></a>

### sidekick.isContent() ⇒ <code>boolean</code>
Checks if the current location is a content URL.

**Kind**: instance method of [<code>Sidekick</code>](#Sidekick)  
**Returns**: <code>boolean</code> - <code>true</code> if content URL, else <code>false</code>  
<a name="Sidekick+isAuthenticated"></a>

### sidekick.isAuthenticated() ⇒ <code>boolean</code>
Checks if the user is logged in.

**Kind**: instance method of [<code>Sidekick</code>](#Sidekick)  
**Returns**: <code>boolean</code> - <code>true</code> if user is logged in (or does not need to be),
else <code>false</code>  
<a name="Sidekick+isAuthorized"></a>

### sidekick.isAuthorized(feature, permission) ⇒ <code>boolean</code>
Checks if the user is allowed to use a feature.

**Kind**: instance method of [<code>Sidekick</code>](#Sidekick)  
**Returns**: <code>boolean</code> - <code>true</code> if user is allowed, else <code>false</code>  

| Param | Type | Description |
| --- | --- | --- |
| feature | <code>string</code> | The feature to check |
| permission | <code>string</code> | The permission to require |

<a name="Sidekick+notify"></a>

### ~~sidekick.notify(message, level)~~
***Deprecated***

Displays a non-sticky notification.

**Kind**: instance method of [<code>Sidekick</code>](#Sidekick)  
**See**: showModal  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| message | <code>string</code> \| <code>Array.&lt;string&gt;</code> |  | The message (lines) to display |
| level | <code>number</code> | <code>2</code> | error (0), warning (1), of info (2) |

<a name="Sidekick+showWait"></a>

### sidekick.showWait()
Displays a sticky notification asking the user to wait.

**Kind**: instance method of [<code>Sidekick</code>](#Sidekick)  
<a name="Sidekick+showModal"></a>

### sidekick.showModal(msg, sticky, level, callback) ⇒ [<code>Sidekick</code>](#Sidekick)
Displays a modal notification.

**Kind**: instance method of [<code>Sidekick</code>](#Sidekick)  
**Returns**: [<code>Sidekick</code>](#Sidekick) - The sidekick  
**Emits**: <code>Sidekick#event:modalshown</code>  

| Param | Type | Description |
| --- | --- | --- |
| msg | <code>object</code> \| <code>string</code> \| <code>Array.&lt;string&gt;</code> | The message (object or lines) |
| msg.message | <code>string</code> | The message |
| msg.css | <code>string</code> | The CSS class to add |
| msg.sticky | <code>boolean</code> | <code>true</code> if message should be sticky (optional) |
| msg.level | <code>number</code> | error (0), warning (1), of info (2, default) |
| msg.callback | <code>function</code> | The function to call when the modal is hidden again |
| sticky | <code>boolean</code> | <code>true</code> if message should be sticky (optional) |
| level | <code>number</code> | error (0), warning (1), of info (2, default) |
| callback | <code>function</code> | The function to call when the modal is hidden again |

<a name="Sidekick+hideModal"></a>

### sidekick.hideModal() ⇒ [<code>Sidekick</code>](#Sidekick)
Hides the modal if shown.

**Kind**: instance method of [<code>Sidekick</code>](#Sidekick)  
**Returns**: [<code>Sidekick</code>](#Sidekick) - The sidekick  
**Emits**: <code>Sidekick#event:modalhidden</code>  
<a name="Sidekick+showHelp"></a>

### sidekick.showHelp(topic, step) ⇒ [<code>Sidekick</code>](#Sidekick)
Displays a balloon with help content.

**Kind**: instance method of [<code>Sidekick</code>](#Sidekick)  
**Returns**: [<code>Sidekick</code>](#Sidekick) - The sidekick  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| topic | [<code>HelpTopic</code>](#HelpTopic) |  | The topic |
| step | <code>number</code> | <code>0</code> | The step number to display (starting with 0) |

<a name="Sidekick+loadCSS"></a>

### sidekick.loadCSS(path) ⇒ [<code>Sidekick</code>](#Sidekick)
Loads the specified default CSS file, or a sibling of the
current JS or HTML file. E.g. when called without argument from
/foo/bar.js, it will attempt to load /foo/bar.css.

**Kind**: instance method of [<code>Sidekick</code>](#Sidekick)  
**Returns**: [<code>Sidekick</code>](#Sidekick) - The sidekick  

| Param | Type | Description |
| --- | --- | --- |
| path | <code>string</code> | The path to the CSS file (optional) |

<a name="Sidekick+switchEnv"></a>

### sidekick.switchEnv(targetEnv, open) ⇒ [<code>Sidekick</code>](#Sidekick)
Switches to (or opens) a given environment.

**Kind**: instance method of [<code>Sidekick</code>](#Sidekick)  
**Returns**: [<code>Sidekick</code>](#Sidekick) - The sidekick  
**Emits**: [<code>envswitched</code>](#Sidekick+event_envswitched)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| targetEnv | <code>string</code> |  | One of the following environments:        <code>dev</code>, <code>preview</code>, <code>live</code> or <code>prod</code> |
| open | <code>boolean</code> | <code>false</code> | <code>true</code> if environment should be opened in new tab |

<a name="Sidekick+update"></a>

### sidekick.update() ⇒ <code>Response</code>
Updates the preview or code of the current resource.

**Kind**: instance method of [<code>Sidekick</code>](#Sidekick)  
**Returns**: <code>Response</code> - The response object  
**Emits**: [<code>updated</code>](#Sidekick+event_updated)  
<a name="Sidekick+delete"></a>

### sidekick.delete() ⇒ <code>Response</code>
Deletes the preview or code of the current resource.

**Kind**: instance method of [<code>Sidekick</code>](#Sidekick)  
**Returns**: <code>Response</code> - The response object  
**Emits**: [<code>deleted</code>](#Sidekick+event_deleted)  
<a name="Sidekick+publish"></a>

### sidekick.publish(path) ⇒ <code>Response</code>
Publishes the page at the specified path if <code>config.host</code> is defined.

**Kind**: instance method of [<code>Sidekick</code>](#Sidekick)  
**Returns**: <code>Response</code> - The response object  
**Emits**: [<code>published</code>](#Sidekick+event_published)  

| Param | Type | Description |
| --- | --- | --- |
| path | <code>string</code> | The path of the page to publish |

<a name="Sidekick+unpublish"></a>

### sidekick.unpublish() ⇒ <code>Response</code>
Unpublishes the current page.

**Kind**: instance method of [<code>Sidekick</code>](#Sidekick)  
**Returns**: <code>Response</code> - The response object  
**Emits**: [<code>unpublished</code>](#Sidekick+event_unpublished)  
<a name="Sidekick+event_shown"></a>

### "shown" (e)
This event is fired when the sidekick has been shown.

**Kind**: event emitted by [<code>Sidekick</code>](#Sidekick)  

| Param | Type | Description |
| --- | --- | --- |
| e | <code>CustomEvent</code> | The event |

**Properties**

| Name | Type | Description |
| --- | --- | --- |
| e.detail.data | [<code>Sidekick</code>](#Sidekick) | The sidekick |

<a name="Sidekick+event_hidden"></a>

### "hidden" (e)
This event is fired when the sidekick has been hidden.

**Kind**: event emitted by [<code>Sidekick</code>](#Sidekick)  

| Param | Type | Description |
| --- | --- | --- |
| e | <code>CustomEvent</code> | The event |

**Properties**

| Name | Type | Description |
| --- | --- | --- |
| e.detail.data | [<code>Sidekick</code>](#Sidekick) | The sidekick |

<a name="Sidekick+event_pluginused"></a>

### "pluginused" (e)
This event is fired when a sidekick plugin has been used.

**Kind**: event emitted by [<code>Sidekick</code>](#Sidekick)  

| Param | Type | Description |
| --- | --- | --- |
| e | <code>CustomEvent</code> | The event |

**Properties**

| Name | Type | Description |
| --- | --- | --- |
| e.detail.data | <code>Object</code> | The event payload |
| e.detail.data.id | <code>string</code> | The plugin ID |
| e.detail.data.button | <code>Element</code> | The button element |

<a name="Sidekick+event_contextloaded"></a>

### "contextloaded" (e)
This event is fired when the context has been loaded.

**Kind**: event emitted by [<code>Sidekick</code>](#Sidekick)  

| Param | Type | Description |
| --- | --- | --- |
| e | <code>CustomEvent</code> | The event |

**Properties**

| Name | Type | Description |
| --- | --- | --- |
| e.detail.data | <code>Object</code> | The event payload |
| e.detail.data.config | [<code>SidekickConfig</code>](#SidekickConfig) | The sidekick configuration |
| e.detail.data.location | <code>Location</code> | The sidekick location |

<a name="Sidekick+event_statusfetched"></a>

### "statusfetched" (e)
This event is fired when the status has been fetched.

**Kind**: event emitted by [<code>Sidekick</code>](#Sidekick)  

| Param | Type | Description |
| --- | --- | --- |
| e | <code>CustomEvent</code> | The event |

**Properties**

| Name | Type | Description |
| --- | --- | --- |
| e.detail.data | <code>Object</code> | The status object |

<a name="Sidekick+event_envswitched"></a>

### "envswitched" (e)
This event is fired when the environment has been switched

**Kind**: event emitted by [<code>Sidekick</code>](#Sidekick)  

| Param | Type | Description |
| --- | --- | --- |
| e | <code>CustomEvent</code> | The event |

**Properties**

| Name | Type | Description |
| --- | --- | --- |
| e.detail.data | <code>Object</code> | The event payload |
| e.detail.data.sourceUrl | <code>string</code> | The URL of the source environment |
| e.detail.data.targetUrl | <code>string</code> | The URL of the target environment |

<a name="Sidekick+event_updated"></a>

### "updated" (e)
This event is fired when content or code has been updated.

**Kind**: event emitted by [<code>Sidekick</code>](#Sidekick)  

| Param | Type | Description |
| --- | --- | --- |
| e | <code>CustomEvent</code> | The event |

**Properties**

| Name | Type | Description |
| --- | --- | --- |
| e.detail.data | <code>string</code> | The updated path |

<a name="Sidekick+event_deleted"></a>

### "deleted" (e)
This event is fired when a resource has been deleted.

**Kind**: event emitted by [<code>Sidekick</code>](#Sidekick)  

| Param | Type | Description |
| --- | --- | --- |
| e | <code>CustomEvent</code> | The event |

**Properties**

| Name | Type | Description |
| --- | --- | --- |
| e.detail.data | <code>string</code> | The deleted path |

<a name="Sidekick+event_published"></a>

### "published" (e)
This event is fired when content has been published.

**Kind**: event emitted by [<code>Sidekick</code>](#Sidekick)  

| Param | Type | Description |
| --- | --- | --- |
| e | <code>CustomEvent</code> | The event |

**Properties**

| Name | Type | Description |
| --- | --- | --- |
| e.detail.data | <code>string</code> | The published path |

<a name="Sidekick+event_unpublished"></a>

### "unpublished" (e)
This event is fired when content has been unpublished.

**Kind**: event emitted by [<code>Sidekick</code>](#Sidekick)  

| Param | Type | Description |
| --- | --- | --- |
| e | <code>CustomEvent</code> | The event |

**Properties**

| Name | Type | Description |
| --- | --- | --- |
| e.detail.data | <code>string</code> | The unpublished path |

<a name="Sidekick+event_loggedin"></a>

### "loggedin" (e)
This event is fired when a user has logged in.

**Kind**: event emitted by [<code>Sidekick</code>](#Sidekick)  

| Param | Type | Description |
| --- | --- | --- |
| e | <code>CustomEvent</code> | The event |

**Properties**

| Name | Type | Description |
| --- | --- | --- |
| e.detail.data | [<code>Sidekick</code>](#Sidekick) | The sidekick |

<a name="Sidekick+event_loggedout"></a>

### "loggedout" (e)
This event is fired when a user has logged out.

**Kind**: event emitted by [<code>Sidekick</code>](#Sidekick)  

| Param | Type | Description |
| --- | --- | --- |
| e | <code>CustomEvent</code> | The event |

**Properties**

| Name | Type | Description |
| --- | --- | --- |
| e.detail.data | [<code>Sidekick</code>](#Sidekick) | The sidekick |

<a name="Sidekick+event_helpnext"></a>

### "helpnext" (e)
This event is fired when a user clicks next on a help dialog.

**Kind**: event emitted by [<code>Sidekick</code>](#Sidekick)  

| Param | Type | Description |
| --- | --- | --- |
| e | <code>CustomEvent</code> | The event |

**Properties**

| Name | Type | Description |
| --- | --- | --- |
| e.detail.data | <code>string</code> | The help topic |

<a name="Sidekick+event_helpdismissed"></a>

### "helpdismissed" (e)
This event is fired when a help dialog has been dismissed.

**Kind**: event emitted by [<code>Sidekick</code>](#Sidekick)  

| Param | Type | Description |
| --- | --- | --- |
| e | <code>CustomEvent</code> | The event |

**Properties**

| Name | Type | Description |
| --- | --- | --- |
| e.detail.data | <code>string</code> | The help topic |

<a name="Sidekick+event_helpacknowledged"></a>

### "helpacknowledged" (e)
This event is fired when a help dialog has been acknowledged.

**Kind**: event emitted by [<code>Sidekick</code>](#Sidekick)  

| Param | Type | Description |
| --- | --- | --- |
| e | <code>CustomEvent</code> | The event |

**Properties**

| Name | Type | Description |
| --- | --- | --- |
| e.detail.data | <code>string</code> | The help topic |

<a name="Sidekick+event_helpoptedout"></a>

### "helpoptedout" (e)
This event is fired when a user decides to opt out of help content.

**Kind**: event emitted by [<code>Sidekick</code>](#Sidekick)  

| Param | Type | Description |
| --- | --- | --- |
| e | <code>CustomEvent</code> | The event |

**Properties**

| Name | Type | Description |
| --- | --- | --- |
| e.detail.data | <code>string</code> | The help topic |

<a name="Plugin"></a>

## Plugin : <code>Object</code>
The plugin configuration.

**Kind**: global typedef  
**Properties**

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| id | <code>string</code> |  | The plugin ID (mandatory) |
| title | <code>string</code> |  | The button text |
| titleI18n | <code>Object</code> | <code>{}</code> | A map of translated button texts |
| url | <code>string</code> |  | The URL to open when the button is clicked |
| passConfig | <code>boolean</code> |  | Append additional sk info to the url as query parameters:                          ref, repo, owner, host, project |
| passReferrer | <code>boolean</code> |  | Append the referrer URL as a query param on new URL button click |
| event | <code>string</code> |  | The name of a custom event to fire when the button is clicked.                      Note: Plugin events get a custom: prefix, e.g. "foo" becomes "custom:foo". |
| containerId | <code>string</code> |  | The ID of a dropdown to add this plugin to (optional) |
| isContainer | <code>boolean</code> |  | Determines whether to turn this plugin into a dropdown |
| isPalette | <code>boolean</code> |  | Determines whether a URL is opened in a palette instead of a new tab |
| paletteRect | <code>string</code> |  | The dimensions and position of a palette (optional) |
| environments | <code>Array.&lt;string&gt;</code> |  | Specifies when to show this plugin                               (admin, edit, dev, preview, live, prod) |
| excludePaths | <code>Array.&lt;string&gt;</code> |  | Exclude the plugin from these paths (glob patterns supported) |
| includePaths | <code>Array.&lt;string&gt;</code> |  | Include the plugin on these paths (glob patterns supported) |

<a name="ViewConfig"></a>

## ViewConfig : <code>Object</code>
A custom view configuration.

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| path | <code>string</code> | The path or globbing pattern where to apply this view |
| viewer | <code>string</code> | The URL to render this view |

<a name="HelpStep"></a>

## HelpStep : <code>Object</code>
The definition of a help step inside a [help topic](#HelpTopic).

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| message | <code>string</code> | The help message |
| selector | <code>string</code> | The CSS selector of the target element |

<a name="HelpTopic"></a>

## HelpTopic : <code>Object</code>
The definition of a help topic.

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| id | <code>string</code> | The ID of the help topic |
| steps | [<code>Array.&lt;HelpStep&gt;</code>](#HelpStep) | An array of [help steps](#HelpStep) |

<a name="SidekickConfig"></a>

## SidekickConfig : <code>Object</code>
The sidekick configuration.

**Kind**: global typedef  
**Properties**

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| owner | <code>string</code> |  | The GitHub owner or organization (mandatory) |
| repo | <code>string</code> |  | The GitHub owner or organization (mandatory) |
| ref | <code>string</code> | <code>&quot;main&quot;</code> | The Git reference or branch (optional) |
| mountpoint | <code>string</code> |  | The content source URL (optional) |
| project | <code>string</code> |  | The name of the project used in the sharing link (optional) |
| plugins | [<code>Array.&lt;Plugin&gt;</code>](#Plugin) |  | An array of [plugin configurations](#Plugin) (optional) |
| previewHost | <code>string</code> |  | The host name of a custom preview CDN (optional) |
| liveHost | <code>string</code> |  | The host name of a custom live CDN (optional) |
| host | <code>string</code> |  | The production host name to publish content to (optional) |
| byocdn | <code>boolean</code> | <code>false</code> | <code>true</code> if the production host is a 3rd party CDN |
| devMode | <code>boolean</code> | <code>false</code> | Loads configuration and plugins from the development environment |
| devOrigin | <code>boolean</code> | <code>http://localhost:3000</code> | URL of the local development environment |
| pushDown | <code>boolean</code> | <code>false</code> | <code>true</code> to have the sidekick push down page content |
| pushDownSelector | <code>string</code> |  | The CSS selector for absolute elements to also push down |
| specialViews | [<code>Array.&lt;ViewConfig&gt;</code>](#ViewConfig) |  | An array of custom [view configurations](#ViewConfig) |
| adminVersion | <code>number</code> |  | The specific version of admin service to use (optional) |

<a name="external_window.hlx.sidekickConfig"></a>

## window.hlx.sidekickConfig : [<code>SidekickConfig</code>](#SidekickConfig)
The global variable holding the initial sidekick configuration.

**Kind**: global external  
<a name="external_window.hlx.sidekick"></a>

## window.hlx.sidekick : [<code>Sidekick</code>](#Sidekick)
The global variable referencing the [Sidekick](#Sidekick) singleton.

**Kind**: global external  
<a name="external_window.hlx.sidekickScript"></a>

## window.hlx.sidekickScript : <code>Element</code>
The <code>script</code> element which loaded the sidekick module.

**Kind**: global external  
<a name="external_window.hlx.initSidekick"></a>

## window.hlx.initSidekick ⇒ [<code>Sidekick</code>](#Sidekick)
Initializes the sidekick and stores a reference to it in
             [window.hlx.sidekick](window.hlx.sidekick).

**Kind**: global external  
**Returns**: [<code>Sidekick</code>](#Sidekick) - The sidekick  

| Param | Type | Description |
| --- | --- | --- |
| cfg | [<code>SidekickConfig</code>](#SidekickConfig) | The sidekick configuration        (extends [window.hlx.sidekickConfig](window.hlx.sidekickConfig)) |

