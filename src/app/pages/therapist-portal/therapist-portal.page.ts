import { Component, OnInit, OnDestroy } from '@angular/core';
import { IsolationDetectorService } from '../../services/isolation-detector.service';
import { EmaService } from '../../services/ema.service';
import { ToastController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { IsolationState } from '../../models/sensor.models';

@Component({
  selector: 'app-therapist-portal',
  templateUrl: './therapist-portal.page.html',
  styleUrls: ['./therapist-portal.page.scss'],
  standalone: false,
})
export class TherapistPortalPage implements OnInit, OnDestroy {
  isolationState: IsolationState | null = null;
  customMessage: string = '';
  Infinity = Infinity;
  private sub: Subscription | null = null;

  constructor(
    private isolationService: IsolationDetectorService,
    private emaService: EmaService,
    private toastCtrl: ToastController
  ) { }

  ngOnInit() {
    this.sub = this.isolationService.isolationState$.subscribe(state => {
      this.isolationState = state;
    });
  }

  ngOnDestroy() {
    if (this.sub) this.sub.unsubscribe();
  }

  async sendCustomEma() {
    if (!this.customMessage.trim()) return;

    this.emaService.triggerTherapistPrompt(this.customMessage);
    this.customMessage = '';

    const toast = await this.toastCtrl.create({
      message: 'Therapist message sent directly to patient device!',
      duration: 3000,
      color: 'success',
      icon: 'checkmark-circle-outline'
    });
    toast.present();
  }
}
