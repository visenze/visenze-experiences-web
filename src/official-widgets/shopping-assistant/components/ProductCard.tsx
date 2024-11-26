import { useContext, useEffect, useState } from 'react';
import useBreakpoint from '../../../common/components/hooks/use-breakpoint';
import { Actions } from '../../../common/types/tracking-constants';
import { WidgetDataContext } from '../../../common/types/contexts';

export interface Product {
  pid: string;
  title: string;
  description: string;
  image_url: string;
  price: string;
  product_url: string;
  review_rating: number;
  review_count: number;
}

interface ProductCardProps {
  product: Product;
  index: number;
  queryId: string;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, index, queryId }) => {
  const breakpoint = useBreakpoint();
  const { productSearch, debugMode } = useContext(WidgetDataContext);
  const [targetRef, setTargetRef] = useState<HTMLAnchorElement | null>(null);

  // Send Product View tracking event when the product is in view
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          observer.disconnect();
          productSearch.send(Actions.PRODUCT_VIEW, {
            label: 'dialogue',
            pid: product.pid,
            pos: index + 1,
            queryId,
            cat: 'Result',
          });
        }
      });
    }, {
      root: null,
      threshold: 0.8,
    });

    if (targetRef) {
      observer.observe(targetRef);
    }

    // Clean up observer when the component unmounts
    return (): void => {
      observer.disconnect();
    };
  }, [targetRef]);

  return (
      <a href={product.product_url} ref={(r) => r && setTargetRef(r)} onClick={() => {
        if (debugMode) {
          return;
        }
        productSearch.send(Actions.PRODUCT_CLICK, {
          label: 'dialogue',
          pid: product.pid,
          pos: index + 1,
          queryId,
          cat: 'Result',
        });
      }}>
        <div className='product-card'>
          <div className='product-image'>
            <img src={product.image_url}/>
          </div>
          <div className={`product-bits ${breakpoint}`}>
            <div className='product-bits-row'>
              <b>{product.title}</b>
            </div>
            <div className='product-bits-row'>
              {product.price}
            </div>
            <div className='product-bits-row'>
              {product.description}
            </div>
          </div>
        </div>
      </a>
  );
};

export default ProductCard;
