import type { FC, ReactElement } from 'react';
import { Skeleton } from '@nextui-org/skeleton';
import { useIntl } from 'react-intl';
import { motion } from 'framer-motion';
import Typewriter from 'typewriter-effect';
import type { ProcessedProduct } from '../../../common/types/product';
import Result from './Result';

/**
 * A placeholder carousel that displays products as they are being received from the ongoing event stream.
 */
const CarouselLoader: FC<{ results: ProcessedProduct[], searchValue: string }> = ({ results, searchValue }): ReactElement => {
  const intl = useIntl();
  return (
    <>
      <div className='relative flex items-center pb-2 pt-4 text-primary'>
        <span>{intl.formatMessage({ id: 'recommendMe.resultCarouselTitle' })}</span>
        &nbsp;&quot;<div className='max-w-13/20 truncate font-bold'>{searchValue}</div>&quot;
      </div>
      <div className='no-scrollbar relative flex gap-x-4 overflow-scroll pt-3'>
        {results.map((result, index) => (
          <div key={`${result.product_id}-${index}`}>
            <Result
              index={index}
              result={result}
            />
          </div>
        ))}
        {results.length <= 4 && [0, 1, 2, 3].map((i) => (
          <>
            {i >= results.length && <Skeleton className='h-64 w-36 md:h-80 md:w-48 lg:h-108 lg:w-64'></Skeleton>}
          </>
        ))}
        <div className='absolute size-full bg-zinc-200 opacity-75 dark:bg-zinc-800'/>

        <div className='absolute flex size-full flex-col items-center justify-center gap-6 p-3 text-lg dark:text-zinc-200 lg:text-3xl'>
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
                  .typeString('Searching the latest trends...')
                  .pauseFor(800)
                  .changeDeleteSpeed(4)
                  .deleteAll()
                  .typeString('Finding the perfect look...')
                  .pauseFor(600)
                  .deleteAll()
                  .typeString('Almost there...')
                  .pauseFor(600)
                  .start();
              }}
            />
          ) : (
            <p className='rounded-xl bg-zinc-200 p-1 dark:bg-zinc-800'>Here&apos;s what I found for you</p>
          )}
        </div>
      </div>
    </>
  );
};

export default CarouselLoader;
