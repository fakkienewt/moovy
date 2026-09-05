import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { NewItems } from '../new-items/new-items';

@Component({
  selector: 'app-main',
  imports: [CommonModule, NewItems],
  templateUrl: './main.html',
  styleUrl: './main.scss',
})
export class Main {

}
