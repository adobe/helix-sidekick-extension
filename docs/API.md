## Classes

<dl>
<dt><a href="#Sidekick">Sidekick</a> ⇐ <code>HTMLElement</code></dt>
<dd><p>The sidekick provides helper tools for authors.</p>
</dd>
</dl>

## Typedefs

<dl>
<dt><a href="#elemAttr">elemAttr</a> : <code>Object.&lt;string, string&gt;</code></dt>
<dd><p>The name and value of the attribute to set on an element.</p>
</dd>
<dt><a href="#elemLstnr">elemLstnr</a> : <code>Object.&lt;string, function()&gt;</code></dt>
<dd><p>The event name and listener to register on an element.</p>
</dd>
<dt><a href="#elemConfig">elemConfig</a> : <code>Object</code></dt>
<dd><p>The configuration of an element to add.</p>
</dd>
<dt><a href="#pluginButton">pluginButton</a> : <code>Object</code></dt>
<dd><p>The configuration for a plugin button. This can be used as
a shorthand for <a href="#elemConfig">elemConfig</a>.</p>
</dd>
<dt><a href="#plugin">plugin</a> : <code>Object</code></dt>
<dd><p>The plugin configuration.</p>
</dd>
<dt><a href="#sidekickConfig">sidekickConfig</a> : <code>Object</code></dt>
<dd><p>The sidekick configuration.
before creating the <a href="#Sidekick">Sidekick</a>.</p>
</dd>
<dt><a href="#publishResponse">publishResponse</a> : <code>Object</code></dt>
<dd><p>The response object for a publish action.</p>
</dd>
</dl>

## External

<dl>
<dt><a href="#external_window.hlx.sidekickConfig">window.hlx.sidekickConfig</a> : <code><a href="#sidekickConfig">sidekickConfig</a></code></dt>
<dd><p>The global variable holding the initial sidekick configuration.</p>
</dd>
<dt><a href="#external_window.hlx.sidekick">window.hlx.sidekick</a> : <code><a href="#Sidekick">Sidekick</a></code></dt>
<dd><p>The global variable referencing the <a href="#Sidekick">Sidekick</a> singleton.</p>
</dd>
<dt><a href="#external_window.hlx.sidekickScript">window.hlx.sidekickScript</a> : <code>Element</code></dt>
<dd><p>The <pre>script</pre> element which loaded the sidekick application.</p>
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
    * [.fetchStatus()](#Sidekick+fetchStatus) ⇒ [<code>Sidekick</code>](#Sidekick)
    * [.loadContext(cfg)](#Sidekick+loadContext) ⇒ [<code>Sidekick</code>](#Sidekick)
    * [.show()](#Sidekick+show) ⇒ [<code>Sidekick</code>](#Sidekick)
    * [.hide()](#Sidekick+hide) ⇒ [<code>Sidekick</code>](#Sidekick)
    * [.toggle()](#Sidekick+toggle) ⇒ [<code>Sidekick</code>](#Sidekick)
    * [.add(plugin)](#Sidekick+add) ⇒ <code>HTMLElement</code>
    * [.get(id)](#Sidekick+get) ⇒ <code>HTMLElement</code>
    * [.remove(id)](#Sidekick+remove) ⇒ [<code>Sidekick</code>](#Sidekick)
    * [.isEditor()](#Sidekick+isEditor) ⇒ <code>boolean</code>
    * [.isDev()](#Sidekick+isDev) ⇒ <code>boolean</code>
    * [.isInner()](#Sidekick+isInner) ⇒ <code>boolean</code>
    * [.isOuter()](#Sidekick+isOuter) ⇒ <code>boolean</code>
    * [.isProd()](#Sidekick+isProd) ⇒ <code>boolean</code>
    * [.isHelix()](#Sidekick+isHelix) ⇒ <code>boolean</code>
    * [.isContent()](#Sidekick+isContent) ⇒ <code>boolean</code>
    * [.notify(msg, level)](#Sidekick+notify)
    * [.showModal(msg, sticky, level, callback)](#Sidekick+showModal) ⇒ [<code>Sidekick</code>](#Sidekick)
    * [.hideModal()](#Sidekick+hideModal) ⇒ [<code>Sidekick</code>](#Sidekick)
    * [.loadCSS(path)](#Sidekick+loadCSS) ⇒ [<code>Sidekick</code>](#Sidekick)
    * [.switchEnv(targetEnv, open)](#Sidekick+switchEnv) ⇒ [<code>Sidekick</code>](#Sidekick)
    * [.update()](#Sidekick+update) ⇒ <code>Response</code>
    * [.delete()](#Sidekick+delete) ⇒ <code>Response</code>
    * [.publish(path, innerOnly)](#Sidekick+publish) ⇒ [<code>publishResponse</code>](#publishResponse)
    * [.unpublish()](#Sidekick+unpublish) ⇒ <code>Response</code>
    * [.addEventListener(type, listener)](#Sidekick+addEventListener)
    * [.removeEventListener(type, listener)](#Sidekick+removeEventListener)
    * ["shown"](#Sidekick+event_shown)
    * ["hidden"](#Sidekick+event_hidden)
    * ["pluginused"](#Sidekick+event_pluginused)
    * ["contextloaded"](#Sidekick+event_contextloaded)
    * ["statusfetched"](#Sidekick+event_statusfetched)
    * ["envswitched"](#Sidekick+event_envswitched)
    * ["updated"](#Sidekick+event_updated)
    * ["deleted"](#Sidekick+event_deleted)
    * ["published"](#Sidekick+event_published)
    * ["unpublished"](#Sidekick+event_unpublished)

<a name="new_Sidekick_new"></a>

### new Sidekick(cfg)
Creates a new sidekick.


| Param | Type | Description |
| --- | --- | --- |
| cfg | [<code>sidekickConfig</code>](#sidekickConfig) | The sidekick config |

<a name="Sidekick+fetchStatus"></a>

### sidekick.fetchStatus() ⇒ [<code>Sidekick</code>](#Sidekick)
Fetches the status for the current resource.

**Kind**: instance method of [<code>Sidekick</code>](#Sidekick)  
**Returns**: [<code>Sidekick</code>](#Sidekick) - The sidekick  
**Emits**: [<code>statusfetched</code>](#Sidekick+event_statusfetched)  
<a name="Sidekick+loadContext"></a>

### sidekick.loadContext(cfg) ⇒ [<code>Sidekick</code>](#Sidekick)
Loads the sidekick configuration and retrieves the location of the current document.

**Kind**: instance method of [<code>Sidekick</code>](#Sidekick)  
**Returns**: [<code>Sidekick</code>](#Sidekick) - The sidekick  
**Emits**: [<code>contextloaded</code>](#Sidekick+event_contextloaded)  

| Param | Type | Description |
| --- | --- | --- |
| cfg | [<code>sidekickConfig</code>](#sidekickConfig) | The sidekick config |

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
| plugin | [<code>plugin</code>](#plugin) | The plugin configuration. |

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
<a name="Sidekick+isHelix"></a>

### sidekick.isHelix() ⇒ <code>boolean</code>
Checks if the current location is a configured Helix URL.

**Kind**: instance method of [<code>Sidekick</code>](#Sidekick)  
**Returns**: <code>boolean</code> - <code>true</code> if Helix URL, else <code>false</code>  
<a name="Sidekick+isContent"></a>

### sidekick.isContent() ⇒ <code>boolean</code>
Checks if the current location is a content URL.

**Kind**: instance method of [<code>Sidekick</code>](#Sidekick)  
**Returns**: <code>boolean</code> - <code>true</code> if content URL, else <code>false</code>  
<a name="Sidekick+notify"></a>

### sidekick.notify(msg, level)
Displays a non-sticky notification.

**Kind**: instance method of [<code>Sidekick</code>](#Sidekick)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| msg | <code>string</code> \| <code>Array.&lt;string&gt;</code> |  | The message (lines) to display |
| level | <code>number</code> | <code>2</code> | error (0), warning (1), of info (2) |

<a name="Sidekick+showModal"></a>

### sidekick.showModal(msg, sticky, level, callback) ⇒ [<code>Sidekick</code>](#Sidekick)
Displays a modal notification.

**Kind**: instance method of [<code>Sidekick</code>](#Sidekick)  
**Returns**: [<code>Sidekick</code>](#Sidekick) - The sidekick  
**Emits**: <code>Sidekick#event:modalshown</code>  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| msg | <code>string</code> \| <code>Array.&lt;string&gt;</code> |  | The message (lines) to display |
| sticky | <code>boolean</code> | <code>false</code> | <code>true</code> if message should be sticky (optional) |
| level | <code>number</code> | <code>2</code> | error (0), warning (1), of info (2) |
| callback | <code>function</code> |  | The function to call when the modal is hidden again |

<a name="Sidekick+hideModal"></a>

### sidekick.hideModal() ⇒ [<code>Sidekick</code>](#Sidekick)
Hides the modal if shown.

**Kind**: instance method of [<code>Sidekick</code>](#Sidekick)  
**Returns**: [<code>Sidekick</code>](#Sidekick) - The sidekick  
**Emits**: <code>Sidekick#event:modalhidden</code>  
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
| targetEnv | <code>string</code> |  | One of the following environments:        <pre>edit</pre>, <pre>preview</pre>, <pre>live</pre> or <pre>prod</pre> |
| open | <code>boolean</code> | <code>false</code> | <pre>true</pre> if environment should be opened in new tab |

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

### sidekick.publish(path, innerOnly) ⇒ [<code>publishResponse</code>](#publishResponse)
Publishes the page at the specified path if <pre>config.host</pre> is defined.

**Kind**: instance method of [<code>Sidekick</code>](#Sidekick)  
**Returns**: [<code>publishResponse</code>](#publishResponse) - The response object  
**Emits**: [<code>published</code>](#Sidekick+event_published)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| path | <code>string</code> |  | The path of the page to publish |
| innerOnly | <code>boolean</code> | <code>false</code> | <pre>true</pre> to only refresh inner CDN, else <pre>false</pre> |

<a name="Sidekick+unpublish"></a>

### sidekick.unpublish() ⇒ <code>Response</code>
Unpublishes the current page.

**Kind**: instance method of [<code>Sidekick</code>](#Sidekick)  
**Returns**: <code>Response</code> - The response object  
**Emits**: [<code>unpublished</code>](#Sidekick+event_unpublished)  
<a name="Sidekick+addEventListener"></a>

### sidekick.addEventListener(type, listener)
Sets up a function that will be called whenever the specified sidekick
event is fired.

**Kind**: instance method of [<code>Sidekick</code>](#Sidekick)  

| Param | Type | Description |
| --- | --- | --- |
| type | <code>string</code> | The event type |
| listener | <code>function</code> | The function to call |

<a name="Sidekick+removeEventListener"></a>

### sidekick.removeEventListener(type, listener)
Removes an event listener previously registered with [addEventListener](addEventListener).

**Kind**: instance method of [<code>Sidekick</code>](#Sidekick)  

| Param | Type | Description |
| --- | --- | --- |
| type | <code>string</code> | The event type |
| listener | <code>function</code> | The function to remove |

<a name="Sidekick+event_shown"></a>

### "shown"
This event is fired when the sidekick has been shown.

**Kind**: event emitted by [<code>Sidekick</code>](#Sidekick)  
<a name="Sidekick+event_hidden"></a>

### "hidden"
This event is fired when the sidekick has been hidden.

**Kind**: event emitted by [<code>Sidekick</code>](#Sidekick)  
<a name="Sidekick+event_pluginused"></a>

### "pluginused"
This event is fired when a sidekick plugin has been used.

**Kind**: event emitted by [<code>Sidekick</code>](#Sidekick)  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| id | <code>string</code> | The plugin ID |
| button | <code>Element</code> | The button element |

<a name="Sidekick+event_contextloaded"></a>

### "contextloaded"
This event is fired when the context has been loaded.

**Kind**: event emitted by [<code>Sidekick</code>](#Sidekick)  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| config | [<code>sidekickConfig</code>](#sidekickConfig) | The sidekick configuration |
| location | <code>Location</code> | The sidekick location |

<a name="Sidekick+event_statusfetched"></a>

### "statusfetched"
This event is fired when the status has been fetched.

**Kind**: event emitted by [<code>Sidekick</code>](#Sidekick)  
<a name="Sidekick+event_envswitched"></a>

### "envswitched"
This event is fired when the environment has been switched

**Kind**: event emitted by [<code>Sidekick</code>](#Sidekick)  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| sourceUrl | <code>string</code> | The URL of the source environment |
| targetUrl | <code>string</code> | The URL of the target environment |

<a name="Sidekick+event_updated"></a>

### "updated"
This event is fired when a path has been updated.

**Kind**: event emitted by [<code>Sidekick</code>](#Sidekick)  
<a name="Sidekick+event_deleted"></a>

### "deleted"
This event is fired when a path has been deleted.

**Kind**: event emitted by [<code>Sidekick</code>](#Sidekick)  
<a name="Sidekick+event_published"></a>

### "published"
This event is fired when a path has been published.

**Kind**: event emitted by [<code>Sidekick</code>](#Sidekick)  
<a name="Sidekick+event_unpublished"></a>

### "unpublished"
This event is fired when a path has been unpublished.

**Kind**: event emitted by [<code>Sidekick</code>](#Sidekick)  
<a name="elemAttr"></a>

## elemAttr : <code>Object.&lt;string, string&gt;</code>
The name and value of the attribute to set on an element.

**Kind**: global typedef  
<a name="elemLstnr"></a>

## elemLstnr : <code>Object.&lt;string, function()&gt;</code>
The event name and listener to register on an element.

**Kind**: global typedef  
<a name="elemConfig"></a>

## elemConfig : <code>Object</code>
The configuration of an element to add.

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| tag | <code>string</code> | The tag name (mandatory) |
| text | <code>string</code> | The text content (optional) |
| attrs | [<code>Array.&lt;elemAttr&gt;</code>](#elemAttr) | The attributes (optional) |
| lstnrs | [<code>Array.&lt;elemLstnr&gt;</code>](#elemLstnr) | The event listeners (optional) |

<a name="pluginButton"></a>

## pluginButton : <code>Object</code>
The configuration for a plugin button. This can be used as
a shorthand for [elemConfig](#elemConfig).

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| text | <code>string</code> | The button text |
| action | <code>function</code> | The click listener |
| isPressed | <code>boolean</code> \| <code>function</code> | Determines whether the button is pressed |

<a name="plugin"></a>

## plugin : <code>Object</code>
The plugin configuration.

**Kind**: global typedef  
**Properties**

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| id | <code>string</code> |  | The plugin ID (mandatory) |
| button | [<code>pluginButton</code>](#pluginButton) |  | A button configuration object (optional) |
| override | <code>boolean</code> | <code>false</code> | True to replace an existing plugin (optional) |
| elements | [<code>Array.&lt;elemConfig&gt;</code>](#elemConfig) |  | An array of elements to add (optional) |
| condition | <code>function</code> |  | Determines whether to show this plugin (optional). This function is expected to return a boolean when called with the sidekick as argument. |
| callback | <code>function</code> |  | A function called after adding the plugin (optional). This function is called with the sidekick and the newly added plugin as arguments. |

<a name="sidekickConfig"></a>

## sidekickConfig : <code>Object</code>
The sidekick configuration.
before creating the [Sidekick](#Sidekick).

**Kind**: global typedef  
**Properties**

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| owner | <code>string</code> |  | The GitHub owner or organization (mandatory) |
| repo | <code>string</code> |  | The GitHub owner or organization (mandatory) |
| ref | <code>string</code> | <code>&quot;main&quot;</code> | The Git reference or branch (optional) |
| project | <code>string</code> |  | The name of the Helix project used in the sharing link (optional) |
| plugins | [<code>Array.&lt;plugin&gt;</code>](#plugin) |  | An array of plugin configurations (optional) |
| outerHost | <code>string</code> |  | The outer CDN's host name (optional) |
| host | <code>string</code> |  | The production host name to publish content to (optional) |
| byocdn | <code>boolean</code> | <code>false</code> | <pre>true</pre> if the production host is a 3rd party CDN |
| hlx3 | <code>boolean</code> | <code>false</code> | <pre>true</pre> if the project is running on Helix 3 |
| devMode | <code>boolean</code> | <code>false</code> | Loads configuration and plugins from the developmemt environment |

<a name="publishResponse"></a>

## publishResponse : <code>Object</code>
The response object for a publish action.

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| ok | <code>boolean</code> | True if publish action was successful, else false |
| status | <code>string</code> | The status text returned by the publish action |
| json | <code>Object</code> | The JSON object returned by the publish action |
| path | <code>string</code> | The path of the published page |

<a name="external_window.hlx.sidekickConfig"></a>

## window.hlx.sidekickConfig : [<code>sidekickConfig</code>](#sidekickConfig)
The global variable holding the initial sidekick configuration.

**Kind**: global external  
<a name="external_window.hlx.sidekick"></a>

## window.hlx.sidekick : [<code>Sidekick</code>](#Sidekick)
The global variable referencing the [Sidekick](#Sidekick) singleton.

**Kind**: global external  
<a name="external_window.hlx.sidekickScript"></a>

## window.hlx.sidekickScript : <code>Element</code>
The <pre>script</pre> element which loaded the sidekick application.

**Kind**: global external  
<a name="external_window.hlx.initSidekick"></a>

## window.hlx.initSidekick ⇒ [<code>Sidekick</code>](#Sidekick)
Initializes the sidekick and stores a reference to it in
             [window.hlx.sidekick](window.hlx.sidekick).

**Kind**: global external  
**Returns**: [<code>Sidekick</code>](#Sidekick) - The sidekick  

| Param | Type | Description |
| --- | --- | --- |
| cfg | <code>Object</code> | The sidekick configuration (extends [window.hlx.sidekickConfig](window.hlx.sidekickConfig)) |

