import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject, Observable } from 'rxjs';

import mockAPIURL from '../../../config/application.config';

@Injectable({
  providedIn: 'root'
})
export class MapService {
  private status: Subject<any> = new Subject(); 

  constructor(
    private http: HttpClient
  ) { }

  /**
   * Initialize API request
   * @param origin {string} - origin address
   * @param destination {string} - destination address
   * @return none
   */
  requestPath(origin: string, destination: string): void {
    let param = {
      origin: origin,
      destination: destination
    };

    let mockAPIObservable = this.requestToken(param).subscribe((token: any) => {
      this.requestRoute(token, 0);
      mockAPIObservable.unsubscribe();
    }, (error: any) => {
      this.updateSubjectState({
        status: 'error',
        code: error.status,
        message: error.error
      });
      mockAPIObservable.unsubscribe();
    });
  }

  /**
   * Request path token from mock API
   * @method requestToken
   * @param parameterObject {Object} - {
   *   origin: {string} - origin address
   *   destination: {string} - destination address
   * }
   * @return {Observable<any>} - api response observable
   */
  requestToken(parameterObject: Object): Observable<any> {
    this.updateSubjectState({
      status: "loading"
    });
    return this.http.post(mockAPIURL + '/route', parameterObject);
  }

  /**
   * Initialize route request
   * @method requestRoute
   * @param token {string} - token string from mockAPI
   * @param retryNumber {number} - retry attempts
   * @return none
   */
  requestRoute(token: string, retryNumber: number): void {
    if (retryNumber < 3) {
      let requestRouteObservable = this.requestRouteCall(token).subscribe((success: any) => {
        requestRouteObservable.unsubscribe();
        switch (success.status) {
          case 'in progress':
            this.updateSubjectState({
              status: "retry"
            });
            setTimeout(() => {
              this.requestRoute(token, retryNumber + 1);
            }, retryNumber * 1000);
            break;
          case 'failure':
            this.updateSubjectState({
              status: "failure"
            });
            break;
          default:
            this.updateSubjectState({
              status: "success",
              payload: success
            });
            break;
        }
      }, (error: any) => {
        requestRouteObservable.unsubscribe();
        this.updateSubjectState({
          status: 'error',
          code: error.status,
          message: error.error
        });
      });
    } else {
      this.updateSubjectState({
        status: "retry fail",
        message: "Server busy: too many retries"
      });
    }
  }

  /**
   * Mock API request to fetch pathing
   * @method requestRouteCall
   * @param token {string} - token string from mockAPI
   * @return {Observable<any>} - api response observable
   */
  requestRouteCall(token: string): Observable<any> {
    return this.http.get(mockAPIURL + "/route/" + token);
  }

  /**
   * Send response to user to update UI depending on state changes
   * @method updateSubjectState
   * @param state {Object} - state update
   * @return none
   */
  updateSubjectState(state: Object): void {
    this.status.next(state);
  }

  /**
   * Return subject state as observable to component
   * @method getSubjectState
   * @return {Observable} subscription to subject state
   */
  getSubjectState(): Observable<any> {
    return this.status.asObservable();
  }
}
