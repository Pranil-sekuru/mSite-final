import { Component } from '@angular/core';

@Component({
  selector: 'app-publications',
  templateUrl: './publications.page.html',
  styleUrls: ['./publications.page.scss'],
  standalone: false,
})
export class PublicationsPage {
  links = [
    { label: 'DOI: 10.1109/MPRV.2024.3377200', url: 'https://doi.org/10.1109/MPRV.2024.3377200', icon: 'link-outline' },
    { label: 'PubMed: PMID 39092185', url: 'https://pubmed.ncbi.nlm.nih.gov/39092185/', icon: 'document-text-outline' },
    { label: 'PMC: PMC11290146', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11290146/', icon: 'library-outline' },
    { label: 'arXiv: 2311.10302', url: 'https://arxiv.org/abs/2311.10302', icon: 'cloud-outline' },
  ];
}
