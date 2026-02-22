import { Injectable } from '@angular/core';
import { ImportDomainStoryService } from '../../import/services/import-domain-story.service';
import { ExportService } from '../../export/services/export.service';
import { AutosaveConfigurationService } from '../../autosave/services/autosave-configuration.service';
import { TitleService } from '../../title/services/title.service';

@Injectable({
    providedIn: 'root'
})
export class PostMessageService {
    private autosaveTimer: any;

    constructor(
        private importService: ImportDomainStoryService,
        private exportService: ExportService,
        private autoSaveConfigurationService: AutosaveConfigurationService,
        private titleService: TitleService
    ) {
    }

    initPostMessages() {
        // No need for default autoSave in embed-mode: the host is responsible to activate it or not via postMessage
        this.autoSaveConfigurationService.setConfiguration({ activated: false, maxDrafts: 0, interval: 0 });

        // Disable description by default for the small real-estate on embeded mode
        this.titleService.setShowDescription(false);

        window.addEventListener('message', (event) => {
            // Trust all since we are in embeded-mode the context of embed in an inframe

            console.log('receive message');
            const data = event.data;
            if (!data || typeof data !== 'object') return;

            // Load / replace diagram with .egn JSON content from host
            if (data.action === 'load' && data.egn && typeof data.egn === 'object') {
                let jsonText = JSON.stringify(data.egn);
                this.importService.importEGN(jsonText);
                this.titleService.updateTitleAndDescription(data.title, this.titleService.getDescription(), true);
                this.sendReply(event.source as Window, event.origin, { status: 'loaded' });
            }

            // Fetch most up-to-date EGN json and send it to host
            if (data.action === 'save-request') {
                this.saveToHost();
            }

            // start auto-save
            if (data.action === 'set-auto-save' && typeof data.interval === 'number') {
                this.startTimer(data.interval);
            }

            // stop auto-save
            if (data.action === 'stop-auto-save') {
                this.stopAutoSaveTimer();
            }
        });
    }

    saveToHost() {
        let egnText = this.exportService.getDST();
        window.parent.postMessage(
            {
                action: 'update',
                egn: JSON.parse(egnText),
                title: this.titleService.getTitle()
            },
            '*'
        );
    }

    private sendReply(target: Window, origin: string, payload: any) {
        target.postMessage(payload, origin);
    }

    private stopAutoSaveTimer(): void {
        if (this.autosaveTimer) {
          clearInterval(this.autosaveTimer);
          this.autosaveTimer = undefined;
        }
    }

    private startTimer(interval: number) {
        this.autosaveTimer = setInterval(() => {
            this.saveToHost();
        }, interval * 1000)
    }
}