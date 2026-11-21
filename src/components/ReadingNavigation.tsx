import { BookOpen, Network } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function ReadingNavigation() {
  const { pathname } = useLocation();
  return <nav aria-label="Main navigation" className="flex shrink-0 items-center gap-1">
    <Button asChild size="sm" variant={pathname === '/' || pathname === '/reading' ? 'secondary' : 'ghost'}><Link to="/" aria-current={pathname === '/' || pathname === '/reading' ? 'page' : undefined}><BookOpen /><span>Reading</span></Link></Button>
    <Button asChild size="sm" variant={pathname === '/graph' ? 'secondary' : 'ghost'}><Link to="/graph" aria-current={pathname === '/graph' ? 'page' : undefined}><Network /><span className="hidden sm:inline">Highlight graph</span><span className="sm:hidden">Graph</span></Link></Button>
  </nav>;
}