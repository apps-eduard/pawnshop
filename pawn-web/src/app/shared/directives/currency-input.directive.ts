import { Directive, ElementRef, HostListener, Input, Output, EventEmitter, OnInit } from '@angular/core';

@Directive({
  selector: '[appCurrencyInput]',
  standalone: true
})
export class CurrencyInputDirective implements OnInit {
  @Input() maxValue?: number;
  @Input() minValue: number = 0;
  @Output() valueChange = new EventEmitter<number>();

  private rawValue: number = 0;

  constructor(private el: ElementRef) {}

  ngOnInit() {
    // Remove stepper buttons for number inputs
    this.el.nativeElement.style.MozAppearance = 'textfield';
    this.el.nativeElement.style.webkitAppearance = 'none';
  }

  @HostListener('input', ['$event'])
  onInput(event: any) {
    this.processInput(event);
  }

  @HostListener('keyup', ['$event'])
  onKeyUp(event: any) {
    this.processInput(event);
  }

  @HostListener('focus', ['$event'])
  onFocus(event: any) {
    // Show raw number for editing
    if (this.rawValue > 0) {
      this.el.nativeElement.value = this.rawValue.toString();
    }
  }

  @HostListener('blur', ['$event'])
  onBlur(event: any) {
    // Format with thousand separators and 2 decimal places
    if (this.rawValue > 0) {
      this.el.nativeElement.value = this.rawValue.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    }
  }

  private processInput(event: any) {
    // Get clean input (numbers and single decimal point only)
    let input = event.target.value.replace(/[^0-9.]/g, '');
    
    // Ensure only one decimal point
    const parts = input.split('.');
    if (parts.length > 2) {
      input = parts[0] + '.' + parts.slice(1).join('');
    }
    
    // Handle empty input
    if (!input || input === '.') {
      this.rawValue = 0;
      this.el.nativeElement.value = '';
      this.valueChange.emit(this.rawValue);
      return;
    }
    
    // Parse the numeric value
    let numValue = parseFloat(input) || 0;
    
    // Apply min/max constraints
    if (numValue < this.minValue) {
      numValue = this.minValue;
    }
    
    if (this.maxValue && numValue > this.maxValue) {
      numValue = this.maxValue;
      // Update the input field immediately to show the capped value
      setTimeout(() => {
        event.target.value = numValue.toString();
      }, 0);
    }
    
    this.rawValue = numValue;
    
    // Update display with the clean input (not formatted yet)
    if (numValue !== parseFloat(input)) {
      // Value was capped, show the capped value
      this.el.nativeElement.value = numValue.toString();
    } else {
      // Normal input, show what user typed
      this.el.nativeElement.value = input;
    }
    
    this.valueChange.emit(this.rawValue);
  }

  // Method to programmatically set value
  setValue(value: number) {
    this.rawValue = value;
    if (value > 0) {
      this.el.nativeElement.value = value.toString();
    } else {
      this.el.nativeElement.value = '0.00';
    }
    this.valueChange.emit(this.rawValue);
  }

  // Method to get current value
  getValue(): number {
    return this.rawValue;
  }
}