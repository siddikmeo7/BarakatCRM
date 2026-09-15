import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Показывает фото товара, а если фото нет — рамку с названием типа товара
 * (Туфли / Спортивная обувь / Сапоги / Другое) вместо иконки-заглушки.
 *
 * className применяется и к фото, и к плейсхолдеру (размер, скругление, flex-shrink-0).
 * placeholderClassName — доп. классы для фона плейсхолдера (перекрывают стандартный bg-slate-100).
 * textClassName — размер/цвет текста типа товара.
 */
export default function ProductPhoto({ photoUrl, productType, className, placeholderClassName, textClassName }) {
  if (photoUrl) {
    return <img src={photoUrl} alt="" className={cn('object-cover', className)} />;
  }
  return (
    <div
      className={cn(
        'flex items-center justify-center text-center px-1 bg-slate-100 dark:bg-slate-800',
        className,
        placeholderClassName
      )}
    >
      <span
        className={cn(
          'font-semibold leading-[1.1] break-words text-slate-500 dark:text-slate-400',
          textClassName
        )}
      >
        {productType || '—'}
      </span>
    </div>
  );
}