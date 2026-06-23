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
  <summary>View the available <code>wigmix-*</code> class names here.</summary>

  | Class name                            | HTML element | Available since | Explanation (if not apparent from the class name)    |
  |---------------------------------------|--------------|-----------------|------------------------------------------------------|
  | `wigmix-shadow-root`                  | `div`        | 1.0.0           |                                                      |
  | `wigmix-popup-trigger-button`         | `button`     | 1.0.0           |                                                      |
  | `wigmix-popup-trigger-icon`           | `div`        | 1.0.0           |                                                      |
  | `wigmix-popup-trigger-text`           | `span`       | 1.0.4           |                                                      |
  | `wigmix-widget-title`                 | `div`        | 1.0.0           |                                                      |
  | `wigmix-reference-image-container`    | `div`        | 1.0.0           |                                                      |
  | `wigmix-reference-image`              | `img`        | 1.0.0           |                                                      |
  | `wigmix-product-grid`                 | `div`        | 1.0.0           |                                                      |
  | `wigmix-product-card`                 | `div`        | 1.0.0           |                                                      |
  | `wigmix-product-card-image-container` | `div`        | 1.0.0           |                                                      |
  | `wigmix-product-card-image`           | `img`        | 1.0.0           |                                                      |
  | `wigmix-product-card-details`         | `div`        | 1.0.0           | Section containing product details e.g. title, price |
  | `wigmix-product-card-title`           | `span`       | 1.0.0           |                                                      |
  | `wigmix-product-card-secondary-title` | `span`       | 1.0.0           |                                                      |
  | `wigmix-product-card-price-row`       | `div`        | 1.0.0           | Row containing both original and discounted prices   |
  | `wigmix-product-card-price`           | `span`       | 1.0.0           |                                                      |
  | `wigmix-product-card-original-price`  | `span`       | 1.0.0           |                                                      |
  | `wigmix-product-card-discount`        | `span`       | 1.0.18          |                                                      |
  | `wigmix-find-similar-button`          | `button`     | 1.0.0           |                                                      |
  | `wigmix-find-similar-icon`            | `div`        | 1.0.0           |                                                      |
  | `wigmix-wishlist-button`              | `button`     | 1.0.18          |                                                      |
  | `wigmix-wishlist-icon`                | `div`        | 1.0.18          |                                                      |
  | `wigmix-add-to-cart-button`           | `button`     | 1.0.18          |                                                      |
  | `wigmix-add-to-cart-icon`             | `div`        | 1.0.18          |                                                      |
  | `wigmix-add-to-cart-text`             | `span`       | 1.0.18          |                                                      |
  | `wigmix-modal`                        | `div`        | 1.0.0           |                                                      |
  | `wigmix-modal-overlay`                | `div`        | 1.0.0           |                                                      |
  | `wigmix-search-bar-overlay`           | `div`        | 1.0.7           |                                                      |

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

<details>
  <summary>How much can I customize the widget before it stops working?</summary>

  In general, there is no limit to what you can change or add into the widgets,
  but there are some files and interfaces that are not recommended to be changed
  as they contain the core logic of the widget:
  
  - `index.tsx` file, i.e. the entrypoint of the widget: changing this file in any way is not recommended.
  - Interfaces in `wigmix-core.ts`: adding new fields is fine, but removing or changing existing ones are not recommended.
</details>

<details>
  <summary>I don't want to use Tailwind CSS. What should I do to remove the generated <code>tw-*</code> CSS definitions from my code bundle?</summary>

  Note that the UI framework HeroUI has implicit dependency to Tailwind CSS. If you are sure of the decision:

  - Remove all HeroUI component usages.
  - In the `app.css` file of the widget, remove all definitions that start with `@tailwind` and `@layer`.
</details>

### Common structure

While the contents of each widget folder varies to some degree,
the following folder structure is expected to be common across all widgets:

```txt
├─ camera-search
   ├─ __snapshots__           <- Folder containing files used in the snapshot testing portion of the unit test
   ├─ components              <- Folder containing some reusable components
   ├─ app.css
   ├─ app.tsx                 <- Wrapper component used to provide context and data
   ├─ camera-search.tsx       <- Main widget code consisting of the components and layout; will have the same name as the widget name
   ├─ camera-search.spec.tsx  <- Unit tests for the widget
   ├─ default-config.ts       <- Default widget customization and displayed texts configuration
   ├─ dev-configs.ts          <- Configuration object for development purpose; under normal circumstances, will not be used in the deployed widget
   ├─ index.html              <- HTML file used for local testing
   ├─ index.tsx               <- Main entrypoint file
   ├─ index-dev.tsx           <- Main entrypoint file for development
   ├─ README.md
```

In most cases, you can start your customization journey from the `<widget-name>.tsx` file (in this example, `camera-search.tsx`).

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

Rezolve widgets by default send pre-defined events such as result load, product view, and product click in relevant situations.
Additional events can be sent from anywhere by adding a code snippet similar to the following:

```ts
const { widgetClient } = useContext(WidgetDataContext);

// ...

widgetClient.sendEvent('event_name', {
  key1: 'value1',
  key2: 'value2',
});
```

### Custom callbacks

Rezolve widgets provide some pre-defined callback events such as after tracking (`trackingCallback`), after product search (`onSearchCallback`), and after product click (`onProductClick`).
Additional callback events can be added as follows:

1. Add the callback definition under `WidgetConfig` interface in `wigmix-core.ts`, e.g.:
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
