# Integration

## Code Snippet

The most basic method to integrate Rezolve widgets to your website is by inserting code snippet
to the page(s) in which you would like for the widgets to appear.

1. Add a container (typically a `<div>`) in which the widget will be inserted to your web page:
   ```html
   <div class="ps-widget-<PLACEMENT_ID>"></div>
   ```
   Depending on the widget type, the container may need to contain additional information in form of `data-*`.
   For example, recommendation widgets typically require product ID as the basis for the recommendation,
   and the product ID is expected to be passed in via `data-pid`:
   ```html
   <div class="ps-widget-<PLACEMENT_ID>" data-pid="<PRODUCT_ID>"></div>
   ```

2. Add the code snippet which will populate the widget to the above container.
   The code snippet looks like:
   ```html
   <script type="text/javascript">
   !function(x,e,t,n,r,i,a){var o=localStorage.getItem("va-uid")||function x(){let e=new Date().getTime(),t="xxxxxxxx.xxxx.4xxx.yxxx.xxxxxxxxxxxx".replace(/[xy]/g,x=>{let t=(e+16*Math.random())%16|0;return e=Math.floor(e/16),("x"===x?t:3&t|8).toString(16)});return t}(),c=x.getElementsByTagName(e)[0],d=x.createElement(e),g=new URL(`https://multimodal.search.rezolve.com/v2/widget-init?app_key=${t}&placement_id=${n}&container=${r}&uid=${o}`);i&&(g+=`&contexts=${i}`),d.async=!0,d.src=g,d.onload=function(){a&&a()},c.parentNode.insertBefore(d,c)}(document,"script","<APP_KEY>","<PLACEMENT_ID>",".ps-widget-<PLACEMENT_ID>");
   </script>
   ```
   While you're welcome to copy the above code and populate the fields accordingly,
   the above code snippet is available in the Discovery Suite console and is pre-filled with the relevant information.

<details>
  <summary>What if there are multiple elements whose selector match the code snippet?</summary>

  In most cases, the widget will be populated only to the first instance of matched element.
  However, there are some widget types, in particular icon-triggered popups,
  in which the icon trigger will be populated to all matched elements.
</details>

## Additional Configuration

The code snippet is designed to make use of the following information in order to render the widget:
- App key, placement ID, and CSS selector (specified in the code snippet)
- Catalog field mappings (fetched from database)
- Widget customization (fetched from database)

It is possible to specify even more configuration by constructing a `visenzeConfigs` object within the page
and specifying the relevant values, such as:

```js
// e.g. for placement ID 5000
window.visenzeConfigs[5000] = {
  // additional configuration parameters to be passed to the widget
  languageSettings: {
    locale: 'en-UK',
    currency: 'GBP',
  },
  searchSettings: {
    limit: 24,
  },
};
```

Note that the configuration object has to be defined BEFORE the widget code snippet is inserted to the page
in order for the settings to be properly overridden.

<details>
  <summary>View the commonly used parameters here.</summary>

  | Parameter name     | Available since | Explanation                                                                                            |
  |--------------------|-----------------|--------------------------------------------------------------------------------------------------------|
  | `searchSettings`   | 1.0.0           | Additional key-value parameters that will be sent to Rezolve search/recommendation APIs.               |
  | `trackingSettings` | 1.0.0           | Additional key-value parameters that will be sent to Rezolve analytics API.                            |
  | `languageSettings` | 1.0.0           | Localization- and internationalization-related settings. See section on l10n and 18n for more details. |
  | `callbacks`        | 1.0.0           | Callbacks settings. See section on callbacks for more details.                                         |
</details>

The full list of available parameters can be seen in the `WidgetConfig` object in `wigmix-core.ts`.
Parameters marked as `@internal` are only for internal usage and not recommended to be set within the configuration object.

### Cloud endpoint (`appSettings.cloud`)

`appSettings.cloud` selects a cloud-specific deployment domain (with its updated API paths) instead
of the legacy domain. It is normally populated automatically by the Rezolve widget initialization API
based on the account's deployment region, so integrators rarely set it manually.

| `appSettings.cloud` | Domain used |
|---------------------|-------------|
| `'aws'`             | `https://multisearch-aw.rezolve.com` |
| `'azure'`           | `https://multisearch-az.rezolve.com` |
| unset               | the API-provided `endpoint`, else the default legacy domain |

Endpoint resolution precedence (highest first):

1. A manually specified `appSettings.endpoint` (via `window.visenzeConfigs`) — always wins.
2. `appSettings.cloud` — when set, the API-provided `endpoint` is ignored.
3. The API-provided `appSettings.endpoint`.
4. The built-in default endpoint.

#### Overriding the endpoint manually

A manually specified `appSettings.endpoint` is the highest-priority signal — it overrides both the
`appSettings.cloud` value and the `endpoint` returned from the Rezolve widget initialization API.
This is useful when you need to pin a widget to a specific domain (e.g. to test against a staging
environment, or to route traffic through your own proxy) regardless of what the API decides.

Set it on the `visenzeConfigs` object for the placement, **before** the widget code snippet is
inserted to the page:

```html
<script type="text/javascript">
  // e.g. for placement ID 5000
  window.visenzeConfigs = window.visenzeConfigs || {};
  window.visenzeConfigs[5000] = {
    appSettings: {
      // This wins over any `cloud` value and any API-provided endpoint.
      endpoint: 'https://your-custom-domain.example.com',
    },
  };
</script>
<!-- ...widget code snippet goes here, after the config above... -->
```

With the manual endpoint set, the widget sends all SDK-routed requests to your domain, and the
direct-`fetch` call sites (shoppable-gallery browse, dev field-mapping fetch) resolve the same domain
via `resolveBaseEndpoint`.

> **Note on API paths:** the cloud domains use updated API paths (e.g. `/v1/visearch/...`,
> `/v2/widget/configs`) while the legacy domains use the original paths. When you set a manual
> endpoint, cloud paths are used **only if the endpoint's origin matches a known cloud domain**
> (`multisearch-aw.rezolve.com` or `multisearch-az.rezolve.com`); any other origin falls back to the
> legacy paths. Note that adding `appSettings.cloud` alongside a manual endpoint does **not** change
> this — once a manual endpoint is set, its origin alone decides which paths are used.

If you only want to switch between the AWS and Azure cloud deployments (rather than an arbitrary
domain) and have the correct cloud paths applied automatically, prefer setting `appSettings.cloud`
instead of a manual endpoint:

```html
<script type="text/javascript">
  window.visenzeConfigs = window.visenzeConfigs || {};
  window.visenzeConfigs[5000] = {
    appSettings: {
      cloud: 'aws', // or 'azure' — overrides the API-provided endpoint, applies cloud paths
    },
  };
</script>
```

#### Overriding the multisearch API manually

Some multisearch-based widgets can route to different API variants based on `appSettings.msApiId`.
This value is normally injected by the Rezolve widget initialization API, but you can override it
manually through `window.visenzeConfigs` for local validation or controlled rollout.
The route is resolved once when the widget client is initialized; changing `msApiId` after the widget
has loaded does not reroute existing widget instances.

Manual `msApiId` resolution precedence (highest first):

1. A non-blank manually specified `appSettings.msApiId` via `window.visenzeConfigs`.
2. The API-provided `appSettings.msApiId`.
3. The built-in default: regular multisearch.

Supported values:

| `appSettings.msApiId` | API route |
|-----------------------|-----------|
| `'1'`                 | regular multisearch |
| `'2'`                 | complementary |
| `'3'`                 | outfit recommendations |
| unset / blank         | regular multisearch |

```html
<script type="text/javascript">
  window.visenzeConfigs = window.visenzeConfigs || {};
  window.visenzeConfigs[5000] = {
    appSettings: {
      msApiId: '3', // routes supported widgets to outfit recommendations
    },
  };
</script>
```

## Callbacks

ViSenze widgets provide some pre-defined callback events such as after tracking (`trackingCallback`), after product search (`onSearchCallback`), and after product click (`onProductClick`).
These callbacks can be captured via the widget configuration object within the website code, such as:

```ts
// e.g. for placement ID 5000
window.visenzeConfigs[5000] = {
  callbacks: {
    onProductClick: (productDetails, trackingMeta) => {
      // process the parameters as needed
    },
  },
};
```

<details>
  <summary>View the commonly used callbacks here.</summary>

  | Class name              | Available since | Explanation                                                                                                                                                                |
  |-------------------------|-----------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
  | `preprocessResponse`    | 1.0.0           | Pre-processes API response before being passed further down into the components.                                                                                           |
  | `trackingCallback`      | 1.0.0           | Fires whenever an event is sent to ViSenze Analytics (precisely: when `sendEvent` is called).                                                                              |
  | `onProductClick`        | 1.0.0           | Fires whenever a product card is clicked on.                                                                                                                               |
  | `onSearchCallback`      | 1.0.0           | Fires whenever response from a search/recommendation API result is returned.                                                                                               |
  | `onAddToWishlistToggle` | 1.0.18          | Fires whenever a wishlist icon is clicked on.                                                                                                                              |
  | `onAddToCartToggle`     | 1.0.18          | Fires whenever an add-to-cart icon is clicked on.                                                                                                                          |
  | `onSearchBarInput`      | 1.0.0           | Fires when there is an input change within the search bar (when exists), such as clicking enter in search bar, selecting an autocomplete option, or uploading a new image. |
</details>

The full list of available callbacks and the parameters for each available callback
can be seen in the `WidgetConfig` object in `wigmix-core.ts` under the `callbacks` field.

## Localization and Internationalization

Note: At the moment, l10n and i18n support in ViSenze widgets is still very limited.
This will be improved within the next few patch versions.

### Locale

The locale is determined through the following hierarchy:
- The value of `languageSettings.locale` field in the widget configuration object.
- The default locale set within the widget customization interface.
- Default value (`en`).

At the moment, ViSenze widgets only support one language pack out-of-the-box.
As the result, the effect of setting locale is limited to changing how currencies are shown.

### Currency

The currency is determined through the following hierarchy:
- The currency value from the product data returned from Rezolve API.
- The value of `languageSettings.currency` field in the widget configuration object.
- The default currency set within the widget customization interface.
- Default value (`USD`).

The [Intl.NumberFormat API](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat)
is used to display the currency in the specified locale.

## Programmatic Access

Rezolve widgets can be accessed from the web page's `window` object for the purpose of
debugging, accessing certain metadata, or programmatically controlling the widget (e.g. opening or hiding).

```ts
// e.g. for placement ID 5000
const visenzeWidget = window.visenzeWidget5000;
// alternatively
const visenzeWidget = window.visenzeWidgets[5000];
```

The full list of available methods can be seen in the `WidgetClient` object in `wigmix-core.ts`.
Methods marked as `@internal` are only for internal usage and not recommended to be used via the widget client.

The following are some common use cases for some of the provided methods.

### Re-rendering the widget

If your page is an SPA, the widget may be removed from view when the page navigates internally (soft navigation)
but not automatically re-rendered.
In order to re-render the widget, you can use the `rerender` method:

```ts
visenzeWidget.rerender();
```

You can additionally specify the new selector in which the widget will be re-rendered on:

```ts
visenzeWidget.rerender('.new-selector');
```

The `rerender` method will attempt to re-render the widget regardless of whether the widget is already rendered or not.
If you're intending to render the widget on selectors that are newly, dynamically added to the page,
you can consider using `renderMissing` instead:

```ts
visenzeWidget.renderMissing();
```

### Hiding the widget

To hide the widget from the user view, you can use the `hideWidget` method:

```ts
visenzeWidget.hideWidget();
```

The reference to the widget will stay and further programmatic access is possible;
for example, the widget can be re-rendered by using the same `rerender` method from the previous section.

### Opening or closing the widget popup

For widgets that have popup behavior, you may require a different way to open the popup
from the existing click-on-provided-icon behavior.
To open the popup containing the widget from anywhere, you can use the `openWidget` method:

```ts
visenzeWidget.openWidget();
```

If the widget is rendered in multiple places, such as icon triggers over a list of product images,
you need to specify the product ID or URL to identify which popup needs to be opened:

```ts
visenzeWidget.openWidget('<PRODUCT_ID_OR_URL>');
```

Similarly, a programmatic way to close widgets that have popup behavior is available:

```ts
visenzeWidget.closeWidget();
```

### Sending custom events

ViSenze widgets by default send pre-defined events such as result load, product view, and product click in relevant situations.
Additional events can be sent from anywhere by using the `sendEvent` or `sendEvents` method of the widget client.

To send `add_to_cart` event when a product is added to the shopping cart:

```ts
visenzeWidget.sendEvent('add_to_cart', {
  pid: '<PRODUCT_ID>',
});
```

To send `transaction` event when a user makes a purchase:

```ts
visenzeWidget.sendEvents('transaction', [
  {
    pid: '<PRODUCT_ID_1>',
    value: VALUE_1,
  },
  {
    pid: '<PRODUCT_ID_2>',
    value: VALUE_2,
  },
]);
```

To send other custom events:

```ts
visenzeWidget.sendEvent('event_name', {
  key1: 'value1',
  key2: 'value2',
});
```

### Toggling dark mode

Rezolve widgets support dark mode theming. If your website has toggles between light and dark mode,
you can make the widgets follow suit by using the `toggleDarkMode` method:

```ts
visenzeWidget.toggleDarkMode();
```
