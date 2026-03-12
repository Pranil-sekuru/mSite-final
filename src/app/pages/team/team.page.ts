import { Component } from '@angular/core';

interface TeamMember {
  name: string;
  role: string;
  affiliation: string;
  icon: string;
  color: string;
}

@Component({
  selector: 'app-team',
  templateUrl: './team.page.html',
  styleUrls: ['./team.page.scss'],
  standalone: false,
})
export class TeamPage {
  team: TeamMember[] = [
    {
      name: 'Subigya Nepal',
      role: 'Lead Researcher',
      affiliation: 'Dartmouth College',
      icon: 'code-slash-outline',
      color: '#3B8BD4'
    },
    {
      name: 'Arvind Pillai',
      role: 'Researcher',
      affiliation: 'Dartmouth College',
      icon: 'analytics-outline',
      color: '#1D9E75'
    },
    {
      name: 'Emma M. Parrish',
      role: 'Clinical Researcher',
      affiliation: 'UC San Diego',
      icon: 'medkit-outline',
      color: '#8B5CF6'
    },
    {
      name: 'Jason Holden',
      role: 'Researcher',
      affiliation: 'UC San Diego',
      icon: 'flask-outline',
      color: '#E8A838'
    },
    {
      name: 'Colin A. Depp',
      role: 'Co-Investigator',
      affiliation: 'UC San Diego',
      icon: 'school-outline',
      color: '#2E4A8E'
    },
    {
      name: 'Andrew T. Campbell',
      role: 'Co-PI',
      affiliation: 'Dartmouth College',
      icon: 'hardware-chip-outline',
      color: '#EF4444'
    },
    {
      name: 'Eric Granholm',
      role: 'Principal Investigator',
      affiliation: 'UC San Diego',
      icon: 'ribbon-outline',
      color: '#1D9E75'
    },
  ];
}
