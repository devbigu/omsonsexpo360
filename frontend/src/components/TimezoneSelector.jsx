import { useState, useMemo } from 'react';
import { FiSearch } from 'react-icons/fi';
import timezones from '../timezones.json';

const TimezoneSelector = ({ value, onChange, disabled = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filteredTimezones = useMemo(() => {
    if (!searchTerm) return timezones;
    
    const term = searchTerm.toLowerCase();
    return timezones.filter(tz => 
      tz.label.toLowerCase().includes(term) ||
      tz.value.toLowerCase().includes(term)
    );
  }, [searchTerm]);

  const selectedTimezone = timezones.find(tz => tz.value === value);

  const handleSelect = (timezone) => {
    onChange(timezone.value);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className="timezone-selector">
      <div 
        className={`timezone-input ${disabled ? 'disabled' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <FiSearch className="search-icon" />
        <span className="timezone-display">
          {selectedTimezone ? selectedTimezone.label : 'Select Timezone...'}
        </span>
        <span className="dropdown-arrow">▼</span>
      </div>

      {isOpen && !disabled && (
        <div className="timezone-dropdown">
          <div className="timezone-search">
            <input
              type="text"
              placeholder="Search timezone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          
          <div className="timezone-options">
            {filteredTimezones.length === 0 ? (
              <div className="timezone-no-results">
                No timezones found
              </div>
            ) : (
              filteredTimezones.map(tz => (
                <div
                  key={tz.value}
                  className={`timezone-option ${tz.value === value ? 'selected' : ''}`}
                  onClick={() => handleSelect(tz)}
                >
                  {tz.label}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {isOpen && (
        <div 
          className="timezone-overlay"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default TimezoneSelector;
