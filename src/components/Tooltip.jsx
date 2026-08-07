import React from 'react';
import { Tooltip as ReactTooltip } from 'react-tooltip';
import { HelpCircle } from 'lucide-react';

const Tooltip = ({ id, content, children, place = "top" }) => {
  return (
    <>
      <span data-tooltip-id={id} data-tooltip-content={content}>
        {children || <HelpCircle size={16} className="text-gray-400 hover:text-gray-600 cursor-help inline-block ml-1" />}
      </span>
      <ReactTooltip 
        id={id} 
        place={place}
        className="max-w-xs z-50"
        style={{
          backgroundColor: '#1f2937',
          color: '#fff',
          borderRadius: '8px',
          padding: '8px 12px',
          fontSize: '13px',
          lineHeight: '1.4',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
        }}
      />
    </>
  );
};

export default Tooltip;
