import React from 'react';
import { DateRange } from 'react-date-range';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';

const DateRangePicker = ({ range, onChange, onClose }) => {
  const r = range ? { ...range, key: 'selection' } : { startDate: new Date(), endDate: new Date(), key: 'selection' };
  return (
    <div className="absolute z-10 top-full mt-2 bg-white border border-gray-300 rounded-lg shadow-lg">
      <DateRange
        editableDateInputs={true}
        onChange={item => onChange(item.selection)}
        moveRangeOnFirstSelection={false}
        ranges={[r]}
        direction="horizontal"
      />
      <div className="p-2 text-right border-t">
        <button onClick={onClose} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">Done</button>
      </div>
    </div>
  );
};

export default DateRangePicker;