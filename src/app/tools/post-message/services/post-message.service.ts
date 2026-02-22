import { Injectable } from '@angular/core';
import { ImportDomainStoryService } from '../../import/services/import-domain-story.service';
import { ExportService } from '../../export/services/export.service';

@Injectable({
    providedIn: 'root'
})
export class PostMessageService {

    constructor(
        private importService: ImportDomainStoryService,
        private exportService: ExportService
    ) {
    }

    initListener() {
        console.log('[Egon] Start listening to parent messages');
        debugger
        window.addEventListener('message', (event) => {
            // Trust all for now: needed in the context of embed in an inframe
            console.log('receive message');
            const data = event.data;

            // Basic format validation
            if (!data || typeof data !== 'object') return;

            // Load / replace diagram with .egn JSON content from host
            if (data.action === 'load' && data.egn && typeof data.egn === 'object') {
                let jsonText = JSON.stringify(data.egn);
                this.importService.importEGN(jsonText);
                this.sendReply(event.source as Window, event.origin, { status: 'loaded' });
            }

            // Fetch most up-to-date EGN json and send it to host
            if (data.action === 'save-request') {
                let egnText = this.exportService.getDST();
                let egn = JSON.parse(egnText);
                this.sendEgnUpdate(egn);
            }
        });
    }

    // Helper to send message back to parent
    sendEgnUpdate(egnJson: any) {
        // You can call this from save / auto-save / periodic sync
        window.parent.postMessage(
            {
                action: 'update',
                egn: egnJson
            },
            '*' // or better: parent's origin if known
        );
    }

    private sendReply(target: Window, origin: string, payload: any) {
        target.postMessage(payload, origin);
    }
}