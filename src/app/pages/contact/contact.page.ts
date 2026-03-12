import { Component } from '@angular/core';

@Component({
  selector: 'app-contact',
  templateUrl: './contact.page.html',
  styleUrls: ['./contact.page.scss'],
  standalone: false,
})
export class ContactPage {
  formData = {
    name: '',
    email: '',
    role: '',
    message: ''
  };
  submitted = false;

  submitForm() {
    this.submitted = true;
    // In a real app, this would send to a backend
    setTimeout(() => {
      this.submitted = false;
      this.formData = { name: '', email: '', role: '', message: '' };
    }, 3000);
  }
}
