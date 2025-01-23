# Integration

## Code Snippet

The most basic method to integrate ViSenze widgets to your website is by inserting code snippet
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

2. Add the code snippet which will populate the ViSenze widget to the above container.
   The code snippet looks like:
   ```html
   <script type="text/javascript">
   !function(x,e,t,n,r,i,a){var o=localStorage.getItem("va-uid")||function x(){let e=new Date().getTime(),t="xxxxxxxx.xxxx.4xxx.yxxx.xxxxxxxxxxxx".replace(/[xy]/g,x=>{let t=(e+16*Math.random())%16|0;return e=Math.floor(e/16),("x"===x?t:3&t|8).toString(16)});return t}(),c=x.getElementsByTagName(e)[0],d=x.createElement(e),g=new URL(`https://search.visenze.com/v2/widget-init?app_key=${t}&placement_id=${n}&container=${r}&uid=${o}`);i&&(g+=`&contexts=${i}`),d.async=!0,d.src=g,d.onload=function(){a&&a()},c.parentNode.insertBefore(d,c)}(document,"script","<APP_KEY>","<PLACEMENT_ID>",".ps-widget-<PLACEMENT_ID>");
   </script>
   ```
   While you're welcome to copy the above code and populate the fields accordingly,
   the above code snippet is available in the Discovery Suite console and is pre-filled with the relevant information.

**Q:** What if there are multiple elements whose selector match the code snippet?<br>
**A:** In most cases, the widget will be populated only to the first instance of matched element.
   However, there are some widget types, in particular icon-triggered popups,
   in which the icon trigger will be populated to all matched elements.

## Additional Configuration

The code snippet is designed to make use of the following information in order to render the widget:
- App key and placement ID (specified in the code snippet)
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

<!-- TODO add section on params explanation -->

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

## Localization and Internationalization

### Locale

The locale is determined through the following hierarchy:
- The value of `languageSettings.locale` field in the widget configuration object.
- The default locale set within the widget customization interface.
- Default value (`en`).

At the moment, ViSenze widgets only support one language pack.
As the result, the effect of setting locale is limited to changing how currencies are shown.

### Currency

The currency is determined through the following hierarchy:
- The currency value from the product data returned from ViSenze API.
- The value of `languageSettings.currency` field in the widget configuration object.
- The default currency set within the widget customization interface.
- Default value (`USD`).

The [Intl.NumberFormat API](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat)
is used to display the currency in the specified locale.

<!-- TODO add section on widget client -->
