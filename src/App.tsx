import { lazy, Suspense } from 'react';
import { BrowserRouter, HashRouter, Route, Routes } from 'react-router';
import { TransitionProvider } from '@/components/Transition';
import { Switcher } from '@/components/Switcher';
import { EXTRA_PAGES } from '@/registry';

const Index = lazy(() => import('@/versions/index/Index'));
const EXTRA = EXTRA_PAGES.map((p) => ({ slug: p.slug, Page: lazy(p.load) }));

// VITE_HASH builds a copy that works from any static host (the phone preview): routes live after the #.
const Router = import.meta.env.VITE_HASH ? HashRouter : BrowserRouter;

export default function App() {
  return (
    <Router>
      <TransitionProvider>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<Index />} />
            {EXTRA.map(({ slug, Page }) => <Route key={slug} path={`/${slug}`} element={<Page />} />)}
            <Route path="*" element={<Index />} />
          </Routes>
        </Suspense>
        <Switcher />
      </TransitionProvider>
    </Router>
  );
}
