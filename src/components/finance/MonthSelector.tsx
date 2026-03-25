import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { format, addMonths, subMonths, parseISO } from 'date-fns';
import { formatMonthYear } from '@/i18n';

interface MonthSelectorProps {
  currentMonth: string; // YYYY-MM
  onChange: (month: string) => void;
}

export function MonthSelector({ currentMonth, onChange }: MonthSelectorProps) {
  const date = parseISO(currentMonth + '-01');
  
  const handlePrevious = () => {
    const newDate = subMonths(date, 1);
    onChange(format(newDate, 'yyyy-MM'));
  };

  const handleNext = () => {
    const newDate = addMonths(date, 1);
    onChange(format(newDate, 'yyyy-MM'));
  };

  const handleToday = () => {
    onChange(format(new Date(), 'yyyy-MM'));
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" onClick={handlePrevious}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      <Button 
        variant="outline" 
        className="min-w-[180px] capitalize gap-2"
        onClick={handleToday}
      >
        <Calendar className="h-4 w-4" />
        {formatMonthYear(date)}
      </Button>
      
      <Button variant="outline" size="icon" onClick={handleNext}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
