'use client';

import { useMemo, type ReactNode } from 'react';
import { Combobox } from '@base-ui/react/combobox';
import { Select } from '@base-ui/react/select';
import { Check, ChevronDown, Search } from 'lucide-react';

type DropdownOption = { value: string; label: string; description?: string };
type DropdownProps = {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  searchLabel?: string;
  emptyMessage?: string;
  disabled?: boolean;
  hideLabel?: boolean;
  icon?: ReactNode;
};

/** Shared styling, with Base UI handling focus, typeahead, and popup positioning. */
export function Dropdown(props: DropdownProps) {
  if (props.searchPlaceholder) return <SearchableDropdown {...props} />;
  const { label, value, onValueChange, options, disabled, hideLabel, icon, placeholder } = props;
  return (
    <div className="dropdown-field">
      <Select.Root
        items={options}
        value={options.some((option) => option.value === value) ? value : null}
        onValueChange={(next) => {
          if (next !== null) onValueChange(next);
        }}
        disabled={disabled}
      >
        <Select.Label className={hideLabel ? 'sr-only' : 'dropdown-label'}>{label}</Select.Label>
        <Select.Trigger className="dropdown-trigger" aria-label={label}>
          {icon && (
            <span className="dropdown-leading-icon" aria-hidden="true">
              {icon}
            </span>
          )}
          <Select.Value
            className="dropdown-value"
            placeholder={placeholder || 'Choose an option'}
          />
          <Select.Icon className="dropdown-chevron">
            <ChevronDown size={16} />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Positioner
            className="dropdown-positioner"
            align="start"
            sideOffset={7}
            collisionPadding={12}
            alignItemWithTrigger={false}
          >
            <Select.Popup className="dropdown-popup">
              <Select.List className="dropdown-list" aria-label={label}>
                {options.map((option) => (
                  <Select.Item key={option.value} value={option.value} className="dropdown-option">
                    <span className="dropdown-option-copy">
                      <Select.ItemText>{option.label}</Select.ItemText>
                      {option.description && (
                        <span className="dropdown-description">{option.description}</span>
                      )}
                    </span>
                    <Select.ItemIndicator className="dropdown-check">
                      <Check size={15} />
                    </Select.ItemIndicator>
                  </Select.Item>
                ))}
              </Select.List>
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
    </div>
  );
}

function SearchableDropdown({
  label,
  value,
  onValueChange,
  options,
  disabled,
  hideLabel,
  icon,
  placeholder,
  searchPlaceholder,
  searchLabel = 'Search options',
  emptyMessage = 'No matches found. Try another search.',
}: DropdownProps) {
  const items = useMemo(
    () =>
      Combobox.createItems(options, {
        getValue: (option) => option.value,
        getLabel: (option) => option.label,
      }),
    [options],
  );
  return (
    <div className="dropdown-field">
      <Combobox.Root
        items={items}
        value={value || null}
        onValueChange={(next) => {
          if (next !== null) onValueChange(next);
        }}
        disabled={disabled}
        autoHighlight
      >
        <Combobox.Label className={hideLabel ? 'sr-only' : 'dropdown-label'}>
          {label}
        </Combobox.Label>
        <Combobox.Trigger className="dropdown-trigger" aria-label={label}>
          {icon && (
            <span className="dropdown-leading-icon" aria-hidden="true">
              {icon}
            </span>
          )}
          <Combobox.Value>
            {(selected) => (
              <span className="dropdown-value">
                {options.find((option) => option.value === selected)?.label ||
                  placeholder ||
                  'Choose an option'}
              </span>
            )}
          </Combobox.Value>
          <Combobox.Icon className="dropdown-chevron">
            <ChevronDown size={16} />
          </Combobox.Icon>
        </Combobox.Trigger>
        <Combobox.Portal>
          <Combobox.Positioner
            className="dropdown-positioner"
            align="start"
            sideOffset={7}
            collisionPadding={12}
          >
            <Combobox.Popup className="dropdown-popup dropdown-searchable" aria-label={label}>
              <div className="dropdown-search">
                <Search size={16} aria-hidden="true" />
                <Combobox.Input
                  className="dropdown-search-input"
                  placeholder={searchPlaceholder}
                  aria-label={searchLabel}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
              <Combobox.Empty>
                <div className="dropdown-empty">{emptyMessage}</div>
              </Combobox.Empty>
              <Combobox.List className="dropdown-list" aria-label={label}>
                {(option: DropdownOption) => (
                  <Combobox.Item
                    key={option.value}
                    value={option.value}
                    className="dropdown-option"
                  >
                    <span className="dropdown-option-copy">
                      <span>{option.label}</span>
                      {option.description && (
                        <span className="dropdown-description">{option.description}</span>
                      )}
                    </span>
                    <Combobox.ItemIndicator className="dropdown-check">
                      <Check size={15} />
                    </Combobox.ItemIndicator>
                  </Combobox.Item>
                )}
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
    </div>
  );
}
