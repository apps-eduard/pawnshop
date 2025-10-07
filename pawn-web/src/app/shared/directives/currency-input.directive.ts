import { Directive, ElementRef, HostListener, Input, Output, EventEmitter, OnInit, AfterViewInit } from '@angular/core';

@Directive({
  selector: '[appCurrencyInput]',
  standalone: true
})
export class CurrencyInputDirective implements OnInit, AfterViewInit {
  @Input() maxValue?: number;
  @Input() minValue: number = 0;
  @Output() valueChange = new EventEmitter<number>();

  private rawValue: number = 0;
  private isFocused = false;
  private lastValidInput = '';

  constructor(private el: ElementRef) {}

  ngOnInit() {
    // Remove stepper buttons for number inputs
    this.el.nativeElement.style.MozAppearance = 'textfield';
    this.el.nativeElement.style.webkitAppearance = 'none';
    this.el.nativeElement.type = 'text'; // Ensure it's text type for proper formatting
  }

  ngAfterViewInit() {
    // Initialize with existing value if any
    const initialValue = this.el.nativeElement.value;
    if (initialValue) {
      this.processInitialValue(initialValue);
    }
  }

  @HostListener('input', ['$event'])
  onInput(event: Event) {
    this.processInput(event);
  }

  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    const allowedKeys = [
      'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
      'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
      'Home', 'End'
    ];

    // Allow Ctrl/Cmd + A, C, V, X
    if ((event.ctrlKey || event.metaKey) && ['a', 'c', 'v', 'x'].includes(event.key.toLowerCase())) {
      return;
    }

    // Allow navigation keys
    if (allowedKeys.includes(event.key)) {
      return;
    }

    // Allow digits and decimal point
    if (!/^[0-9.]$/.test(event.key)) {
      event.preventDefault();
      return;
    }

    // Prevent multiple decimal points
    const currentValue = this.el.nativeElement.value;
    if (event.key === '.' && currentValue.includes('.')) {
      event.preventDefault();
    }
  }

  @HostListener('focus')
  onFocus() {
    this.isFocused = true;
    const element = this.el.nativeElement;

    // Show raw number for editing (remove formatting)
    if (this.rawValue > 0) {
      element.value = this.rawValue.toString();
      this.lastValidInput = element.value;
    } else {
      element.value = '';
      this.lastValidInput = '';
    }

    // Select all text for easy replacement
    setTimeout(() => element.select(), 0);
  }

  @HostListener('blur')
  onBlur() {
    this.isFocused = false;
    const element = this.el.nativeElement;

    // Clean up the input value
    let cleanValue = element.value.replace(/[^0-9.]/g, '');

    // Handle trailing decimal point
    if (cleanValue.endsWith('.')) {
      cleanValue = cleanValue.slice(0, -1);
    }

    // Parse and validate
    let numValue = parseFloat(cleanValue) || 0;

    // Apply constraints
    numValue = this.applyConstraints(numValue);
    this.rawValue = numValue;

    // Format with thousand separators and 2 decimal places with peso sign
    if (numValue > 0) {
      element.value = '₱ ' + numValue.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    } else {
      element.value = '₱ 0.00';
    }

    this.valueChange.emit(this.rawValue);
  }

  @HostListener('paste', ['$event'])
  onPaste(event: ClipboardEvent) {
    event.preventDefault();
    const pastedText = event.clipboardData?.getData('text') || '';
    const cleanedText = pastedText.replace(/[^0-9.]/g, '');

    // Insert cleaned text
    const element = this.el.nativeElement;
    const start = element.selectionStart || 0;
    const end = element.selectionEnd || 0;
    const currentValue = element.value;

    const newValue = currentValue.substring(0, start) + cleanedText + currentValue.substring(end);
    element.value = newValue;

    // Trigger input processing
    const inputEvent = new Event('input', { bubbles: true });
    element.dispatchEvent(inputEvent);
  }

  private processInput(event: Event) {
    const element = event.target as HTMLInputElement;
    let input = element.value;

    // Get cursor position before processing
    const cursorPos = element.selectionStart || 0;

    // Get clean input (numbers and single decimal point only)
    input = input.replace(/[^0-9.]/g, '');

    // Ensure only one decimal point
    const parts = input.split('.');
    if (parts.length > 2) {
      input = parts[0] + '.' + parts.slice(1).join('');
    }

    // Limit decimal places to 2
    if (parts.length === 2 && parts[1].length > 2) {
      input = parts[0] + '.' + parts[1].substring(0, 2);
    }

    // Handle empty input
    if (!input || input === '.' || input === '0.') {
      this.rawValue = 0;
      element.value = input;
      this.lastValidInput = input;
      this.valueChange.emit(this.rawValue);
      return;
    }

    // Parse the numeric value
    let numValue = parseFloat(input) || 0;

    // Check constraints without forcing them during typing
    let shouldUpdate = false;
    if (this.maxValue && numValue > this.maxValue) {
      numValue = this.maxValue;
      input = numValue.toString();
      shouldUpdate = true;
    }

    if (numValue < this.minValue && input !== '' && !input.endsWith('.')) {
      // Only enforce minValue on blur, not during typing
      if (!this.isFocused) {
        numValue = this.minValue;
        input = numValue.toString();
        shouldUpdate = true;
      }
    }

    this.rawValue = numValue;

    // Update display
    if (shouldUpdate) {
      element.value = input;
      // Restore cursor position
      element.setSelectionRange(cursorPos, cursorPos);
    } else {
      element.value = input;
    }

    this.lastValidInput = input;
    this.valueChange.emit(this.rawValue);
  }

  private processInitialValue(value: string) {
    const cleanValue = value.replace(/[^0-9.]/g, '');
    const numValue = parseFloat(cleanValue) || 0;
    this.rawValue = this.applyConstraints(numValue);

    if (this.rawValue > 0) {
      this.el.nativeElement.value = '₱ ' + this.rawValue.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    } else {
      this.el.nativeElement.value = '₱ 0.00';
    }
  }

  private applyConstraints(value: number): number {
    let result = value;

    if (result < this.minValue) {
      result = this.minValue;
    }

    if (this.maxValue && result > this.maxValue) {
      result = this.maxValue;
    }

    // Round to 2 decimal places
    result = Math.round(result * 100) / 100;

    return result;
  }

  // Method to programmatically set value
  setValue(value: number) {
    const constrainedValue = this.applyConstraints(value);
    this.rawValue = constrainedValue;

    if (this.isFocused) {
      this.el.nativeElement.value = constrainedValue > 0 ? constrainedValue.toString() : '';
    } else {
      if (constrainedValue > 0) {
        this.el.nativeElement.value = '₱ ' + constrainedValue.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        });
      } else {
        this.el.nativeElement.value = '₱ 0.00';
      }
    }

    this.valueChange.emit(this.rawValue);
  }

  // Method to get current value
  getValue(): number {
    return this.rawValue;
  }

  // Method to reset value
  reset() {
    this.rawValue = 0;
    this.lastValidInput = '';
    this.el.nativeElement.value = this.isFocused ? '' : '₱ 0.00';
    this.valueChange.emit(this.rawValue);
  }
}
