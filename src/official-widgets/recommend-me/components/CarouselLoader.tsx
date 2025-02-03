import type { FC, ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { Skeleton } from '@heroui/skeleton';
import { useIntl } from 'react-intl';
import { motion } from 'framer-motion';
import type { ProcessedProduct } from '../../../common/types/product';
import ProductCard from '../../../common/components/product-card/ProductCard';

const Typewriter: FC<{ texts: string[] }> = ({ texts }) => {
  const [step, setStep] = useState<'TYPE' | 'DELETE'>('TYPE');
  const [index, setIndex] = useState(0);
  const [displayText, setDisplayText] = useState(texts[0]);

  const typeTick = (i: number, fullText: string): void => {
    setDisplayText(fullText.substring(0, i));
    if (i === fullText.length) {
      setTimeout(() => {
        setStep('DELETE');
      }, 3000);
      return;
    }
    setTimeout(() => {
      typeTick(i + 1, fullText);
    }, 100);
  };

  const deleteTick = (i: number, fullText: string): void => {
    setDisplayText(fullText.substring(0, i));
    if (i === 0) {
      if (index < texts.length - 1) {
        setIndex((idx) => idx + 1);
      }
      setStep('TYPE');
      return;
    }
    setTimeout(() => {
      deleteTick(i - 1, fullText);
    }, 20);
  };

  useEffect(() => {
    if (step === 'TYPE') {
      typeTick(0, texts[index]);
    } else if (step === 'DELETE') {
      deleteTick(texts[index].length, texts[index]);
    }
  }, [step]);

  return <span>{displayText}</span>;
};

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
      <div className='no-scrollbar relative grid grid-cols-5 gap-x-4 overflow-scroll'>
        {results.map((result, index) => (
            <ProductCard key={`${result.product_id}-${index}`}
                         index={index}
                         result={result}
                         hasFindSimilar={false}
                         isRecommendation={false}
                         pwPrefix='rm' />
        ))}
        {results.length <= 4 && [0, 1, 2, 3, 4].map((i) => (
          <>
            {i >= results.length && <Skeleton className='w-full aspect-square'></Skeleton>}
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
            <Typewriter texts={[
              intl.formatMessage({ id: 'resultLoading1' }),
              intl.formatMessage({ id: 'resultLoading2' }),
              intl.formatMessage({ id: 'resultLoading3' }),
            ]} />
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
