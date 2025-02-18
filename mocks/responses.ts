import type { ProductSearchResponseError, ProductSearchResponseSuccess } from 'visearch-javascript-sdk';

export const getStandardRecommendationPidNotFoundResponse = (): ProductSearchResponseError => ({
  reqid: '12345678',
  status: 'fail',
  method: 'product/recommendations',
  error: {
    code: 122,
    message: 'Query product_id not found.',
  },
});

export const getStandardRecommendationSuccessResponse = (): ProductSearchResponseSuccess => ({
  reqid: '87654321',
  status: 'OK',
  method: 'product/recommendations',
  page: 1,
  limit: 20,
  total: 1000,
  product_types: [],
  result: [
    {
      product_id: 'pid-1',
      main_image_url: 'https://main-image-1',
      data: {
        product_url: 'https://product-1',
        additional_image_url: [
          'https://additional-image-1-1',
          'https://additional-image-1-2',
        ],
        price: {
          currency: 'USD',
          value: '19.3',
        },
        title: 'Product Title 1',
        brand: 'Product Brand 1',
      },
      best_images: [
        {
          type: 'product',
          url: 'https://best-images-1-1',
          index: '0',
        },
      ],
    },
    {
      product_id: 'pid-2',
      main_image_url: 'https://main-image-2',
      data: {
        product_url: 'https://product-2',
        additional_image_url: [
          'https://additional-image-2-1',
          'https://additional-image-2-2',
        ],
        price: {
          currency: 'USD',
          value: '7.0',
        },
        title: 'Product Title 2',
        brand: 'Product Brand 2',
      },
      best_images: [
        {
          type: 'product',
          url: 'https://best-images-2-1',
          index: '0',
        },
      ],
    },
    {
      product_id: 'pid-3',
      main_image_url: 'https://main-image-3',
      data: {
        product_url: 'https://product-3',
        additional_image_url: [
          'https://additional-image-3-1',
          'https://additional-image-3-2',
        ],
        price: {
          currency: 'USD',
          value: '15.5',
        },
        title: 'Product Title 3',
        brand: 'Product Brand 3',
      },
      best_images: [
        {
          type: 'product',
          url: 'https://best-images-3-1',
          index: '0',
        },
      ],
    },
    {
      product_id: 'pid-4',
      main_image_url: 'https://main-image-4',
      data: {
        product_url: 'https://product-4',
        additional_image_url: [
          'https://additional-image-4-1',
          'https://additional-image-4-2',
        ],
        price: {
          currency: 'USD',
          value: '14.8',
        },
        title: 'Product Title 4',
        brand: 'Product Brand 4',
      },
      best_images: [
        {
          type: 'product',
          url: 'https://best-images-4-1',
          index: '0',
        },
      ],
    },
    {
      product_id: 'pid-5',
      main_image_url: 'https://main-image-5',
      data: {
        product_url: 'https://product-5',
        additional_image_url: [
          'https://additional-image-5-1',
          'https://additional-image-5-2',
        ],
        price: {
          currency: 'USD',
          value: '14.8',
        },
        title: 'Product Title 5',
        brand: 'Product Brand 5',
      },
      best_images: [
        {
          type: 'product',
          url: 'https://best-images-5-1',
          index: '0',
        },
      ],
    },
    {
      product_id: 'pid-6',
      main_image_url: 'https://main-image-6',
      data: {
        product_url: 'https://product-6',
        additional_image_url: [
          'https://additional-image-6-1',
          'https://additional-image-6-2',
        ],
        price: {
          currency: 'USD',
          value: '20.6',
        },
        title: 'Product Title 6',
        brand: 'Product Brand 6',
      },
      best_images: [
        {
          type: 'product',
          url: 'https://best-images-6-1',
          index: '0',
        },
      ],
    },
    {
      product_id: 'pid-7',
      main_image_url: 'https://main-image-7',
      data: {
        product_url: 'https://product-7',
        additional_image_url: [
          'https://additional-image-7-1',
          'https://additional-image-7-2',
        ],
        price: {
          currency: 'USD',
          value: '23.0',
        },
        title: 'Product Title 7',
        brand: 'Product Brand 7',
      },
      best_images: [
        {
          type: 'product',
          url: 'https://best-images-7-1',
          index: '0',
        },
      ],
    },
    {
      product_id: 'pid-8',
      main_image_url: 'https://main-image-8',
      data: {
        product_url: 'https://product-8',
        additional_image_url: [
          'https://additional-image-8-1',
          'https://additional-image-8-2',
        ],
        price: {
          currency: 'USD',
          value: '18.9',
        },
        title: 'Product Title 8',
        brand: 'Product Brand 8',
      },
      best_images: [
        {
          type: 'product',
          url: 'https://best-images-8-1',
          index: '0',
        },
      ],
    },
    {
      product_id: 'pid-9',
      main_image_url: 'https://main-image-9',
      data: {
        product_url: 'https://product-9',
        additional_image_url: [
          'https://additional-image-9-1',
          'https://additional-image-9-2',
        ],
        price: {
          currency: 'USD',
          value: '7.0',
        },
        title: 'Product Title 9',
        brand: 'Product Brand 9',
      },
      best_images: [
        {
          type: 'product',
          url: 'https://best-images-9-1',
          index: '0',
        },
      ],
    },
    {
      product_id: 'pid-10',
      main_image_url: 'https://main-image-10',
      data: {
        product_url: 'https://product-10',
        additional_image_url: [
          'https://additional-image-10-1',
          'https://additional-image-10-2',
        ],
        price: {
          currency: 'USD',
          value: '14.8',
        },
        title: 'Product Title 10',
        brand: 'Product Brand 10',
      },
      best_images: [
        {
          type: 'product',
          url: 'https://best-images-10-1',
          index: '0',
        },
      ],
    },
    {
      product_id: 'pid-11',
      main_image_url: 'https://main-image-11',
      data: {
        product_url: 'https://product-11',
        additional_image_url: [
          'https://additional-image-11-1',
          'https://additional-image-11-2',
        ],
        price: {
          currency: 'USD',
          value: '3.0',
        },
        title: 'Product Title 11',
        brand: 'Product Brand 11',
      },
      best_images: [
        {
          type: 'product',
          url: 'https://best-images-11-1',
          index: '0',
        },
      ],
    },
    {
      product_id: 'pid-12',
      main_image_url: 'https://main-image-12',
      data: {
        product_url: 'https://product-12',
        additional_image_url: [
          'https://additional-image-12-1',
          'https://additional-image-12-2',
        ],
        price: {
          currency: 'USD',
          value: '12.5',
        },
        title: 'Product Title 12',
        brand: 'Product Brand 12',
      },
      best_images: [
        {
          type: 'product',
          url: 'https://best-images-12-1',
          index: '0',
        },
      ],
    },
    {
      product_id: 'pid-13',
      main_image_url: 'https://main-image-13',
      data: {
        product_url: 'https://product-13',
        additional_image_url: [
          'https://additional-image-13-1',
          'https://additional-image-13-2',
        ],
        price: {
          currency: 'USD',
          value: '19.6',
        },
        title: 'Product Title 13',
        brand: 'Product Brand 13',
      },
      best_images: [
        {
          type: 'product',
          url: 'https://best-images-13-1',
          index: '0',
        },
      ],
    },
    {
      product_id: 'pid-14',
      main_image_url: 'https://main-image-14',
      data: {
        product_url: 'https://product-14',
        additional_image_url: [
          'https://additional-image-14-1',
          'https://additional-image-14-2',
        ],
        price: {
          currency: 'USD',
          value: '7.1',
        },
        title: 'Product Title 14',
        brand: 'Product Brand 14',
      },
      best_images: [
        {
          type: 'product',
          url: 'https://best-images-14-1',
          index: '0',
        },
      ],
    },
    {
      product_id: 'pid-15',
      main_image_url: 'https://main-image-15',
      data: {
        product_url: 'https://product-15',
        additional_image_url: [
          'https://additional-image-15-1',
          'https://additional-image-15-2',
        ],
        price: {
          currency: 'USD',
          value: '23.3',
        },
        title: 'Product Title 15',
        brand: 'Product Brand 15',
      },
      best_images: [
        {
          type: 'product',
          url: 'https://best-images-15-1',
          index: '0',
        },
      ],
    },
    {
      product_id: 'pid-16',
      main_image_url: 'https://main-image-16',
      data: {
        product_url: 'https://product-16',
        additional_image_url: [
          'https://additional-image-16-1',
          'https://additional-image-16-2',
        ],
        price: {
          currency: 'USD',
          value: '21.1',
        },
        title: 'Product Title 16',
        brand: 'Product Brand 16',
      },
      best_images: [
        {
          type: 'product',
          url: 'https://best-images-16-1',
          index: '0',
        },
      ],
    },
    {
      product_id: 'pid-17',
      main_image_url: 'https://main-image-17',
      data: {
        product_url: 'https://product-17',
        additional_image_url: [
          'https://additional-image-17-1',
          'https://additional-image-17-2',
        ],
        price: {
          currency: 'USD',
          value: '6.5',
        },
        title: 'Product Title 17',
        brand: 'Product Brand 17',
      },
      best_images: [
        {
          type: 'product',
          url: 'https://best-images-17-1',
          index: '0',
        },
      ],
    },
    {
      product_id: 'pid-18',
      main_image_url: 'https://main-image-18',
      data: {
        product_url: 'https://product-18',
        additional_image_url: [
          'https://additional-image-18-1',
          'https://additional-image-18-2',
        ],
        price: {
          currency: 'USD',
          value: '2.0',
        },
        title: 'Product Title 18',
        brand: 'Product Brand 18',
      },
      best_images: [
        {
          type: 'product',
          url: 'https://best-images-18-1',
          index: '0',
        },
        {
          type: 'outfit',
          url: 'https://best-images-18-2',
          index: '1',
        },
      ],
    },
    {
      product_id: 'pid-19',
      main_image_url: 'https://main-image-19',
      data: {
        product_url: 'https://product-19',
        additional_image_url: [
          'https://additional-image-19-1',
          'https://additional-image-19-2',
        ],
        price: {
          currency: 'USD',
          value: '7.0',
        },
        title: 'Product Title 19',
        brand: 'Product Brand 19',
      },
      best_images: [
        {
          type: 'product',
          url: 'https://best-images-19-1',
          index: '0',
        },
      ],
    },
    {
      product_id: 'pid-20',
      main_image_url: 'https://main-image-20',
      data: {
        product_url: 'https://product-20',
        additional_image_url: [
          'https://additional-image-20-1',
          'https://additional-image-20-2',
        ],
        price: {
          currency: 'USD',
          value: '26.7',
        },
        title: 'Product Title 20',
        brand: 'Product Brand 20',
      },
      best_images: [
        {
          type: 'product',
          url: 'https://best-images-20-1',
          index: '0',
        },
        {
          type: 'outfit',
          url: 'https://best-images-20-2',
          index: '2',
        },
      ],
    },
  ],
  catalog_fields_mapping: {
    main_image_url: 'main_image_url',
    product_url: 'product_url',
    additional_image_url: 'additional_image_url',
    price: 'price',
    product_id: 'product_id',
    category: 'category',
    title: 'title',
    brand: 'brand',
  },
  facets: [],
  product_info: {
    product_id: 'pid-main',
    main_image_url: 'https://main-image-main',
    data: {
      product_url: 'https://product-main',
      additional_image_url: [
        'https://additional-image-main-1',
        'https://additional-image-main-2',
      ],
      price: {
        currency: 'USD',
        value: '16.1',
      },
      title: 'Product Title Main',
      brand: 'Product Brand Main',
    },
    best_images: [
      {
        type: 'product',
        url: 'https://best-images-main-1',
        index: '0',
      },
    ],
  },
});
