'use client';
import { useUiTranslation } from '@/components/ui-language';

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
  /** Keep popups in the same top layer when used inside a native dialog. */
  portalContainer?: HTMLElement | null;
};

/** Shared styling, with Base UI handling focus, typeahead, and popup positioning. */
export function Dropdown(props: DropdownProps) {
  const translate = useUiTranslation();
  props = {
    ...props,
    label: translate(props.label),
    placeholder: props.placeholder ? translate(props.placeholder) : undefined,
    searchPlaceholder: props.searchPlaceholder ? translate(props.searchPlaceholder) : undefined,
    searchLabel: props.searchLabel ? translate(props.searchLabel) : undefined,
    emptyMessage: props.emptyMessage ? translate(props.emptyMessage) : undefined,
    options: props.options.map((option) => ({
      ...option,
      label: translate(option.label),
      description: option.description ? translate(option.description) : undefined,
    })),
  };
  const tr = useUiTranslation();

  if (props.searchPlaceholder) return <SearchableDropdown {...props} />;
  const {
    label,
    value,
    onValueChange,
    options,
    disabled,
    hideLabel,
    icon,
    placeholder,
    portalContainer,
  } = props;
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
            placeholder={placeholder || tr('Choose an option')}
          />
          <Select.Icon className="dropdown-chevron">
            <ChevronDown size={16} />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal container={portalContainer ?? undefined}>
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
                      <Select.ItemText>{tr(option.label)}</Select.ItemText>
                      {option.description && (
                        <span className="dropdown-description">{tr(option.description)}</span>
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
  portalContainer,
}: DropdownProps) {
  const tr = useUiTranslation();

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
                  tr('Choose an option')}
              </span>
            )}
          </Combobox.Value>
          <Combobox.Icon className="dropdown-chevron">
            <ChevronDown size={16} />
          </Combobox.Icon>
        </Combobox.Trigger>
        <Combobox.Portal container={portalContainer ?? undefined}>
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
                      <span>{tr(option.label)}</span>
                      {option.description && (
                        <span className="dropdown-description">{tr(option.description)}</span>
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
