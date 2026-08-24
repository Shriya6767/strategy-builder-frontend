export { API_URL, BASE_URL } from "../services/api";

export const DEFAULT_SYMBOL      = 'SPXW';
export const DEFAULT_ENTRY_TIME  = '13:30';
export const DEFAULT_EXIT_TIME   = '20:00';
export const DEFAULT_LOT_SIZE    = 100;
export const DEFAULT_CAPITAL     = 50000;

export const DTE_OPTIONS = [
  { value: '0', label: '0DTE' },
  { value: '1', label: '1DTE' },
];

export const STRATEGY_TYPES = [
  { id: 'intraday',   label: 'Intraday'   },
  { id: 'btst',       label: '1lot'       },
  { id: 'sequential', label: 'Sequential' },
  { id: 'positional', label: 'Positional' },
];

export const MONTHS = [
  { value: '01', label: 'January'   },
  { value: '02', label: 'February'  },
  { value: '03', label: 'March'     },
  { value: '04', label: 'April'     },
  { value: '05', label: 'May'       },
  { value: '06', label: 'June'      },
  { value: '07', label: 'July'      },
  { value: '08', label: 'August'    },
  { value: '09', label: 'September' },
  { value: '10', label: 'October'   },
  { value: '11', label: 'November'  },
  { value: '12', label: 'December'  },
];

export const YEARS = ['2022', '2023', '2024', '2025'];
