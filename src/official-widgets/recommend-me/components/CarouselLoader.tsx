import type { FC, ReactElement } from 'react';
import { Skeleton } from '@heroui/skeleton';
import { useIntl } from 'react-intl';
import { motion } from 'framer-motion';
import Typewriter from 'typewriter-effect';
import type { ProcessedProduct } from '../../../common/types/product';
import ProductCard from '../../../common/components/product-card/ProductCard';

/**
 * A placeholder carousel that displays products as they are being received from the ongoing event stream.
 */
const CarouselLoader: FC<{ results: ProcessedProduct[]; searchValue: string }> = ({ results, searchValue }): ReactElement => {
  const intl = useIntl();
  return (
    <>
      <div className='relative flex items-center pb-2 pt-4 text-primary'>
        <span>{intl.formatMessage({ id: 'resultCarouselTitle' })}</span>
        &nbsp;&quot;<div className='max-w-13/20 truncate font-bold'>{searchValue}</div>&quot;
      </div>
      <div className='no-scrollbar relative grid grid-cols-5 gap-x-4 overflow-scroll pt-3'>
        {results.map((result, index) => (
            <ProductCard key={`${result.product_id}-${index}`}
                         index={index}
                         result={result}
                         hasFindSimilar={false}
                         isRecommendation={false}
                         pwPrefix='rm'
                         imageClasses='w-36 md:w-48 lg:w-64' />
        ))}
        {results.length <= 4 && [0, 1, 2, 3, 4].map((i) => (
          <>
            {i >= results.length && <Skeleton className='h-48 w-36 md:h-64 md:w-48 lg:h-80 lg:w-64'></Skeleton>}
          </>
        ))}
        <div className='absolute size-full bg-zinc-200 opacity-75 dark:bg-zinc-800'/>

        <div className='absolute flex size-full flex-col items-center justify-center gap-6 p-3 text-lg text-black lg:text-3xl'>
          <motion.div
            className='size-5 bg-blue-700 dark:bg-blue-400'
            animate={{
              scale: [1, 2, 2, 1, 1],
              rotate: [0, 0, 180, 180, 0],
              borderRadius: ['0%', '0%', '50%', '50%', '0%'],
            }}
            transition={{
              duration: 2,
              ease: 'easeInOut',
              times: [0, 0.2, 0.5, 0.8, 1],
              repeat: Infinity,
              repeatDelay: 1,
            }}
          />
          {results.length === 0 ? (
            <Typewriter
              onInit={(typewriter) => {
                typewriter
                  .pauseFor(200)
                  .typeString(intl.formatMessage({ id: 'resultLoading1' }))
                  .pauseFor(800)
                  .changeDeleteSpeed(4)
                  .deleteAll()
                  .typeString(intl.formatMessage({ id: 'resultLoading2' }))
                  .pauseFor(600)
                  .deleteAll()
                  .typeString(intl.formatMessage({ id: 'resultLoading3' }))
                  .pauseFor(600)
                  .start();
              }}
            />
          ) : (
            <p className='rounded-xl p-1'>
              {intl.formatMessage({ id: 'resultRendering' })}
            </p>
          )}
        </div>
      </div>
    </>
  );
};

export default CarouselLoader;
