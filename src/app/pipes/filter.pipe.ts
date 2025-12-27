// src/app/pipes/filter.pipe.ts

import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filter',
  pure: false
})
export class FilterPipe implements PipeTransform {
  transform(items: any[], filter: any): any[] {
    if (!items || !filter) {
      return items;
    }

    const key = Object.keys(filter)[0];
    return items.filter(item => item[key] === filter[key]);
  }
}
