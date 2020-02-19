import { Injectable } from '@angular/core';
import { HttpClient,  HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { retry, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class RestApiService {

  // Define API
  apiURL = 'http://localhost:3000';

  constructor( private http: HttpClient) { }

  // Http Options
  // tslint:disable-next-line: max-line-length
  headers = new HttpHeaders({ 'Content-Type': 'application/json',
                              'Access-Control-Allow-Origin' : '*',
                              'Access-Control-Allow-Methods' : 'GET, POST, DELETE, PUT',
                              'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept'
                            });

  // HttpClient API get() method => Fetch employees list
  getIndividualSteps(param): Observable<any> {
    console.log('Param received: ' + param);
    return this.http.get<any>(this.apiURL+'/getIndividualSteps', {headers : this.headers, params : param })
    .pipe(
      retry(1),
      catchError(this.handleError)
    );
  }



  getGroupSteps(param): Observable<any> {
    console.log('Param received: ' + param);
    return this.http.get<any>(this.apiURL+'/getGroupSteps', {headers : this.headers, params : param })
    .pipe(
      retry(1),
      catchError(this.handleError)
    );
  }



  // Error handling
  handleError(error) {
    let errorMessage = '';
    if(error.error instanceof ErrorEvent) {
      // Get client-side error
      errorMessage = error.error.message;
    } else {
      // Get server-side error
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
    }
    window.alert(errorMessage);
    return throwError(errorMessage);
 }
}
