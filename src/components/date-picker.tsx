'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Popover } from '@base-ui/react/popover';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Dropdown } from './dropdown';
import {
  calendarAddDays,
  calendarAddMonths,
  calendarClamp,
  calendarDate,
  calendarGrid,
  calendarLabel,
  calendarToday,
  validLocalDateTime,
} from '@/lib/calendar';
import s from './date-picker.module.css';

const months = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const monthOptions = months.map((label, index) => ({
  label,
  value: String(index + 1).padStart(2, '0'),
}));

type DatePickerProps = {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  clearable?: boolean;
  min?: string;
  max?: string;
  hint?: string;
  name?: string;
  placeholder?: string;
};

export function DatePicker({
  label,
  value,
  onValueChange,
  disabled = false,
  clearable = true,
  min = '0001-01-01',
  max = '9999-12-31',
  hint,
  name,
  placeholder = 'Choose a date',
}: DatePickerProps) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null),
    popup = useRef<HTMLDivElement>(null);
  const moveFocus = useRef(false);
  const [open, setOpen] = useState(false);
  const [portalContainer, setPortalContainer] = useState<HTMLDialogElement | null>(null);
  const [active, setActive] = useState(calendarDate(value) ? value : '2000-01-01');
  const [today, setToday] = useState('');
  const [typed, setTyped] = useState(value),
    [error, setError] = useState('');
  const lower = calendarDate(min) ? min : '0001-01-01',
    upper = calendarDate(max) ? max : '9999-12-31';
  const month = active.slice(0, 7),
    year = Number(active.slice(0, 4));
  const days = calendarGrid(month);
  const monthTitle = `${months[Number(active.slice(5, 7)) - 1]} ${year}`;
  const firstYear = Math.max(Number(lower.slice(0, 4)), year - 100);
  const lastYear = Math.min(Number(upper.slice(0, 4)), year + 100);
  const yearOptions = Array.from({ length: Math.max(0, lastYear - firstYear + 1) }, (_, index) => ({
    value: String(firstYear + index).padStart(4, '0'),
    label: String(firstYear + index),
  }));
  const allowed = (date: string) => !!calendarDate(date) && date >= lower && date <= upper;
  const previous = calendarAddMonths(active, -1),
    next = calendarAddMonths(active, 1);

  function changeOpen(nextOpen: boolean) {
    if (nextOpen && disabled) return;
    if (nextOpen) {
      const current = calendarToday();
      setToday(current);
      setActive(calendarClamp(calendarDate(value) ? value : current, lower, upper));
      setTyped(value);
      setError('');
      setPortalContainer(trigger.current?.closest('dialog') ?? null);
    }
    setOpen(nextOpen);
  }
  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);
  useEffect(() => {
    if (open && moveFocus.current) {
      popup.current?.querySelector<HTMLButtonElement>(`[data-date="${active}"]`)?.focus();
      moveFocus.current = false;
    }
  }, [active, open]);
  function select(date: string) {
    if (disabled || (!allowed(date) && !(clearable && date === ''))) return;
    onValueChange(date);
    setOpen(false);
  }
  function move(date: string, focus = false) {
    if (!date) return;
    moveFocus.current = focus;
    setActive(calendarClamp(date, lower, upper));
  }
  function keyDown(event: KeyboardEvent<HTMLButtonElement>, date: string) {
    const weekday = (calendarDate(date)!.getUTCDay() + 6) % 7;
    const offset = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
      Home: -weekday,
      End: 6 - weekday,
    }[event.key];
    if (offset !== undefined) {
      event.preventDefault();
      move(calendarAddDays(date, offset), true);
    } else if (event.key === 'PageUp' || event.key === 'PageDown') {
      event.preventDefault();
      move(
        calendarAddMonths(date, (event.key === 'PageUp' ? -1 : 1) * (event.shiftKey ? 12 : 1)),
        true,
      );
    }
  }
  function applyTyped() {
    if (!calendarDate(typed)) {
      setError('Enter a real date in YYYY-MM-DD format.');
      return;
    }
    if (!allowed(typed)) {
      setError(`Choose a date between ${calendarLabel(lower)} and ${calendarLabel(upper)}.`);
      return;
    }
    select(typed);
  }

  return (
    <div className={s.field}>
      <label htmlFor={`${id}-trigger`} className={s.label}>
        {label}
      </label>
      {name && <input type="hidden" name={name} value={value} disabled={disabled} />}
      <Popover.Root open={open} onOpenChange={changeOpen}>
        <Popover.Trigger
          ref={trigger}
          id={`${id}-trigger`}
          className={s.trigger}
          disabled={disabled}
          aria-label={label}
          aria-describedby={`${id}-value${hint ? ` ${id}-hint` : ''}`}
        >
          <span id={`${id}-value`} data-placeholder={!value || undefined}>
            {calendarLabel(value) || placeholder}
          </span>
          <CalendarDays size={17} aria-hidden="true" />
        </Popover.Trigger>
        <Popover.Portal container={portalContainer ?? undefined}>
          <Popover.Positioner
            className={s.positioner}
            align="start"
            sideOffset={8}
            collisionPadding={12}
          >
            <Popover.Popup
              ref={popup}
              className={s.popup}
              aria-label={`Choose ${label.toLowerCase()}`}
              initialFocus={() =>
                popup.current?.querySelector<HTMLButtonElement>(`[data-date="${active}"]`) ?? false
              }
              finalFocus={trigger}
            >
              <div className={s.heading}>
                <Popover.Title>Choose {label.toLowerCase()}</Popover.Title>
                <Popover.Close
                  className={s.iconButton}
                  aria-label={`Close ${label.toLowerCase()} calendar`}
                >
                  <X size={16} />
                </Popover.Close>
              </div>
              <div className={s.navigation}>
                <button
                  type="button"
                  className={s.iconButton}
                  aria-label="Previous month"
                  disabled={!previous || previous.slice(0, 7) < lower.slice(0, 7)}
                  onClick={() => move(previous)}
                >
                  <ChevronLeft size={17} />
                </button>
                <Dropdown
                  label="Calendar month"
                  hideLabel
                  value={active.slice(5, 7)}
                  options={monthOptions}
                  portalContainer={portalContainer}
                  onValueChange={(value) =>
                    move(calendarAddMonths(active, Number(value) - Number(active.slice(5, 7))))
                  }
                />
                <Dropdown
                  label="Calendar year"
                  hideLabel
                  value={active.slice(0, 4)}
                  options={yearOptions}
                  portalContainer={portalContainer}
                  searchPlaceholder="Find year…"
                  searchLabel="Find calendar year"
                  onValueChange={(value) =>
                    move(calendarAddMonths(active, (Number(value) - year) * 12))
                  }
                />
                <button
                  type="button"
                  className={s.iconButton}
                  aria-label="Next month"
                  disabled={!next || next.slice(0, 7) > upper.slice(0, 7)}
                  onClick={() => move(next)}
                >
                  <ChevronRight size={17} />
                </button>
              </div>
              <span id={`${id}-month`} className="sr-only" aria-live="polite">
                {monthTitle}
              </span>
              <table role="grid" aria-labelledby={`${id}-month`} className={s.calendar}>
                <thead>
                  <tr>
                    {weekdays.map((day) => (
                      <th key={day} scope="col" abbr={day}>
                        {day.slice(0, 2)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 6 }, (_, week) => (
                    <tr key={week}>
                      {days.slice(week * 7, week * 7 + 7).map((date, index) => (
                        <td key={date || index} aria-selected={date === value}>
                          {date && (
                            <button
                              type="button"
                              data-date={date}
                              className={s.day}
                              disabled={!allowed(date)}
                              data-outside={date.slice(0, 7) !== month || undefined}
                              data-selected={date === value || undefined}
                              aria-label={calendarLabel(date, true)}
                              aria-current={date === today ? 'date' : undefined}
                              tabIndex={date === active ? 0 : -1}
                              onKeyDown={(event) => keyDown(event, date)}
                              onClick={() => select(date)}
                            >
                              {Number(date.slice(8))}
                            </button>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className={s.keyboardHelp}>Arrow keys move days · Page Up / Down moves months</p>
              <div className={s.manual}>
                <label htmlFor={`${id}-typed`}>
                  Enter a date <span>YYYY-MM-DD</span>
                </label>
                <div>
                  <input
                    id={`${id}-typed`}
                    value={typed}
                    placeholder="YYYY-MM-DD"
                    inputMode="text"
                    autoComplete="off"
                    maxLength={10}
                    aria-label={`${label} in YYYY-MM-DD format`}
                    aria-invalid={!!error}
                    aria-describedby={error ? `${id}-error` : undefined}
                    onChange={(event) => {
                      setTyped(event.target.value);
                      setError('');
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        applyTyped();
                      }
                    }}
                  />
                  <button type="button" onClick={applyTyped}>
                    Apply date
                  </button>
                </div>
                {error && (
                  <p id={`${id}-error`} className={s.error} role="alert">
                    {error}
                  </p>
                )}
              </div>
              <div className={s.actions}>
                <button type="button" disabled={!allowed(today)} onClick={() => select(today)}>
                  Today
                </button>
                {clearable && (
                  <button type="button" disabled={!value} onClick={() => select('')}>
                    Clear date
                  </button>
                )}
              </div>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
      {hint && (
        <small id={`${id}-hint`} className={s.hint}>
          {hint}
        </small>
      )}
    </div>
  );
}

const hours = Array.from({ length: 24 }, (_, i) => ({
  value: String(i).padStart(2, '0'),
  label: String(i).padStart(2, '0'),
}));
const minutes = Array.from({ length: 60 }, (_, i) => ({
  value: String(i).padStart(2, '0'),
  label: String(i).padStart(2, '0'),
}));

export function DateTimePicker({
  label,
  value,
  onValueChange,
  disabled,
}: Pick<DatePickerProps, 'label' | 'value' | 'onValueChange' | 'disabled'>) {
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const date = value.slice(0, 10),
    hour = value.slice(11, 13) || '09',
    minute = value.slice(14, 16) || '00';
  const portalContainer = root?.closest('dialog');
  return (
    <div ref={setRoot} className={s.dateTime}>
      <DatePicker
        label={label}
        value={date}
        disabled={disabled}
        placeholder="Publish now"
        onValueChange={(next) => onValueChange(next ? `${next}T${hour}:${minute}` : '')}
      />
      <div className={s.timeFields}>
        <Dropdown
          label="Hour (24-hour)"
          value={hour}
          options={hours}
          portalContainer={portalContainer}
          disabled={disabled || !date}
          onValueChange={(next) => onValueChange(`${date}T${next}:${minute}`)}
        />
        <Dropdown
          label="Minute"
          value={minute}
          options={minutes}
          portalContainer={portalContainer}
          disabled={disabled || !date}
          onValueChange={(next) => onValueChange(`${date}T${hour}:${next}`)}
        />
      </div>
      <p className={s.hint}>
        Leave the date empty to publish now. Times use your device’s local time zone.
      </p>
      {value && !validLocalDateTime(value) && (
        <p className={s.error} role="alert">
          This local time is unavailable. Choose another time.
        </p>
      )}
    </div>
  );
}
