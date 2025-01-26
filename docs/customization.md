# Customization

Depending on your need, there are a few ways provided to customize any of the officially supported widgets.

## Look-and-feel customization

Some look-and-feel customization options such as font color, background color, number of product cards per grid
are available out-of-the-box from the Discovery Suite console.

<!-- TODO add screenshot of customization page -->

## Custom CSS

More advanced CSS customization is available by using `wigmix-*` class names,
where `*` represents the logical section of the widget, such as `wigmix-widget-title`.
This can be used alongside the previously mentioned look-and-feel customization.

<!-- TODO add screenshot of custom CSS slot -->

<details>
  <summary>View the available `wigmix-*` class names here.</summary>

  | Class name                            | HTML element |
  |---------------------------------------|--------------|
  | `wigmix-popup-trigger`                | `div`        |
  | `wigmix-widget-title`                 | `div`        |
  | `wigmix-reference-image`              | `div`        |
  | `wigmix-product-grid`                 | `div`        |
  | `wigmix-product-card`                 | `a`          |
  | `wigmix-product-card-image`           | `img`        |
  | `wigmix-product-card-title`           | `span`       |
  | `wigmix-product-card-secondary-title` | `span`       |
  | `wigmix-product-card-price`           | `span`       |
  | `wigmix-product-card-original-price`  | `span`       |
  | `wigmix-find-similar-button`          | `button`     |
  | `wigmix-modal`                        | `div`        |
  | `wigmix-modal-overlay`                | `div`        |

  Naturally, not all `wigmix-*` class names are available on all widgets;
  a class name is present only when the logical section it is representing is present in the widget.
</details>

All `wigmix-*` class names are covered under our versioning policy;
once added, they can only be removed, if the need for such arises, in a new major release.

## Custom code

For more advanced customization needs such as significant layout change or additional information to be displayed,
you are welcome to customize the widget code directly to suit your needs.

1. Fork or clone this repository and customize the widget code as needed.
2. Bundle the widget with the relevant command, e.g. `npm run build:camera-search`.
3. Locate the bundled file in the relevant directory, e.g. `dist/camera-search`.
4. Upload the bundle in the provided interface in the Discovery Suite console.

Note: please do NOT file a pull request with the above changes.
While we welcome external contributions, we will only accept changes which we deem to be beneficial
in general use cases (as opposed to changes catered to display of widget in specific websites).

### Common structure

While the contents of each widget folder varies to some degree,
the following folder structure is expected to be common across all widgets:

```txt
├─ camera-search
   ├─ components          <- Folder containing some reusable components
   ├─ app.css
   ├─ app.tsx             <- Wrapper component used to provide context and data, including localized texts
   ├─ camera-search.tsx   <- Main widget code consisting of the components and layout; will have the same name as the widget name
   ├─ default-config.ts   <- Default widget customization configuration
   ├─ dev-configs.ts      <- Configuration object for development purpose; will not be used in the deployed widget (unless the code is edited as such)
   ├─ index.html          <- HTML file used for local testing
   ├─ index.tsx           <- Main entrypoint file
   ├─ index-dev.tsx       <- Main entrypoint file for development
   ├─ README.md
```

In most cases, you can start your customization journey from the `camera-search.tsx` file.

### Using own customization config

By default, even if custom code bundle is used, the deployed widget will still make use of
the look-and-feel customization and custom CSS that are configured through the Discovery Suite console.

If you would like to control the customization config entirely within the code itself,
i.e. rely entirely on `default-config.ts` (which you are free to customize),
you need to change the following line in the relevant `app.tsx` file:

```tsx
// Change this
const ENABLE_CUSTOMIZATION = true;

// To
const ENABLE_CUSTOMIZATION = false;
```

### Custom events

ViSenze widgets by default send pre-defined events such as result load, product view, and product click in relevant situations.
Additional events can be sent from anywhere by adding a code snippet similar to the following:

```ts
const { productSearch } = useContext(WidgetDataContext);

// ...

productSearch.sendEvent('event_name', {
  key1: 'value1',
  key2: 'value2',
});
```

### Custom callbacks

ViSenze widgets provide some pre-defined callback events such as after tracking (`trackingCallback`), after product search (`onSearchCallback`), and after product click (`onProductClick`).
Additional callback events can be added as follows:

1. Add the callback definition under `WidgetConfig` interface in `visenze-core.ts`, e.g.:
   ```ts
   export interface WidgetConfig {
     // ...
     callbacks: {
       // ... other existing callbacks
       myNewCallback?: (param1: string) => void;
     };
     // ...
   }
   ```

2. Utilize the callback function in the desired place in your code, e.g.:
   ```ts
   const { myNewCallback } = config.callbacks;
   // ...
   myNewCallback('Hello world!');
   ```

3. Capture the callback in the widget configuration object within the website code as follows:
   ```ts
   // e.g. for placement ID 5000
   window.visenzeConfigs[5000] = {
     // ... other configurations
     callbacks: {
       myNewCallback: (param1) => {
         // process the parameter as needed
       },
     },
   };
   ```
