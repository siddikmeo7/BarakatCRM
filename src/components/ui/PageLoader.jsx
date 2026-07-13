import React from 'react';
import BrandedLoader from './BrandedLoader';

export default function PageLoader({ message = 'Загрузка...' }) {
  return <BrandedLoader message={message} />;
}