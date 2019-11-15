import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { MapsAPILoader } from '@agm/core';
import { MapService } from '../../service/map.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss'],
  animations: [
    trigger('hideShow', [
      state('shown', style({
        transform: 'translateX(0)',
        opacity: 1,
        visibility: 'visible'
      })),
      state('hidden', style({
        transform: 'translateX(-250px)',
        opacity: 0,
        visibility: 'hidden'
      })),
      state('buttonHide', style({
        transform: 'translateX(-250px)',
        opacity: 0,
        visibility: 'hidden'
      })),
      state('buttonShow', style({
        transform: 'translateX(0)',
        opacity: 1,
        visibility: 'visible'
      })),
      transition('shown => hidden', [
        animate('0.5s')
      ]),
      transition('hidden => shown', [
        animate('0.5s')
      ]),
      transition('buttonHide => buttonShow', [
        animate('0.5s')
      ]),
      transition('buttonShow => buttonHide', [
        animate('0.5s')
      ])
    ])
  ]
})
export class MapComponent implements OnInit, OnDestroy {
  lat: number = 0;
  lng: number = 0;
  initCoordinates: any = {
    lat: 0,
    lng: 0
  }
  hideInputTab: boolean = false;
  originAddress: string = null;
  destinationAddress: string = null;
  originAutocompleteListener: any;
  destinationAutocompleteListener: any;
  applicationStatus: Subscription;
  loaderShow: boolean = false;
  loaderMessage: string = "Requesting...";
  responseMessages: any = undefined;
  markers: any = [];

  constructor(
    private mapsAPILoader: MapsAPILoader,
    private mapService: MapService,
    private chRef: ChangeDetectorRef
  ) {
    this.mapService.getSubjectState().subscribe((state: any) => {
      this.markers = [];
      switch (state.status) {
        case 'loading':
          this.loaderShow = true;
          break;
        case 'retry':
          this.loaderMessage = "Server Busy: Retrying...";
          break;
        case 'failure':
          // Add Error response message display: fail to compute direction
          this.loaderMessage = "Requesting...";
          this.loaderShow = false;
          this.responseMessages = [{
              title: "Error",
              message: "Location not accessible by car"
            }]
          break;
        case 'error':
          // Add Error response message display: Internal server error
          this.loaderMessage = "Requesting...";
          this.loaderShow = false;
          this.responseMessages = [{
            title: "Error",
            message: state.message
          }]
          break;
        case 'retry fail':
          // Add error response message: too many retries
          this.loaderMessage = "Requesting...";
          this.loaderShow = false;
          this.responseMessages = [{
            title: "Error",
            message: state.message
          }]
          break;
        default:
          // Success - display waypoints and route
          this.loaderMessage = "Requesting...";
          this.loaderShow = false;
          this.processResult(state.payload);
          break;
      }
    });
  }

  ngOnInit() {
    this.initializeMap();
    this.initializeAutocomplete();
  }

  ngOnDestroy() {
    this.originAutocompleteListener.removeListener();
    this.destinationAutocompleteListener.removeListener();
  }

  /**
   * Initialize agm map // Set coordinates depending on user location. If location is disabled, set to hongkong coordinates
   * @method initializeMap
   * @return none
   */
  private initializeMap(): void {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        this.initCoordinates.lat = position.coords.latitude;
        this.initCoordinates.lng = position.coords.longitude;
        this.setInitCoordinates(position.coords.latitude, position.coords.longitude);
      }, () => {
        this.initCoordinates.lat = 22.3193;
        this.initCoordinates.lng = 114.1694;
        this.setInitCoordinates(22.3193, 114.1694);
      });
    } else {
      this.initCoordinates.lat = 22.3193;
      this.initCoordinates.lng = 114.1694;
      this.setInitCoordinates(22.3193, 114.1694);
    }
  }

  /**
   * Set initial coordinates of map
   * @method setInitCoordinates
   * @param lat {number} - chosen initial latitude
   * @param lng {number} - chosen initial longitude
   * @return none
   */
  private setInitCoordinates(lat: number, lng: number): void {
    this.lat = lat;
    this.lng = lng;
    this.chRef.detectChanges();
  }

  /**
   * Initialization of autocomplete functionality
   * @method initializeAutocomplete
   * @return none
   */
  private initializeAutocomplete(): void {
    let originInputElement = <HTMLInputElement> document.getElementById("originInput");
    let destinationInputElement = <HTMLInputElement> document.getElementById("destinationInput");

    this.mapsAPILoader.load().then(() => {
      let autocompleteOrigin = new google.maps.places.Autocomplete(originInputElement, {
        fields: ["formatted_address", "name", "types"]
      }), autocompleteDestination = new google.maps.places.Autocomplete(destinationInputElement, {
        fields: ["formatted_address", "name", "types"]
      });

      this.originAutocompleteListener = autocompleteOrigin.addListener("place_changed", () => {
        let origin: google.maps.places.PlaceResult = autocompleteOrigin.getPlace();

        if (origin.formatted_address) {
          if (origin.types.indexOf("establishment") >= 0) {
            this.originAddress = origin.name + ", " + origin.formatted_address;
          } else {
            this.originAddress = origin.formatted_address;
          }
        } else {
          return;
        }
      });

      this.destinationAutocompleteListener = autocompleteDestination.addListener("place_changed", () => {
        let destination: google.maps.places.PlaceResult = autocompleteDestination.getPlace();

        if (destination.formatted_address) {
          if (destination.types.indexOf("establishment") >= 0) {
            this.destinationAddress = destination.name + ", " + destination.formatted_address;
          } else {
            this.destinationAddress = destination.formatted_address;
          }
        } else {
          return;
        }
      });
    })
  }

  /**
   * Submit form to request token
   * @method submitForm
   * @param origin {string} - origin address (or name + address if establishment)
   * @param destination {string} - destination address (or name + address if establishment)
   * @return none
   */
  private submitForm(origin: string, destination: string): void {
    this.mapService.requestPath(origin, destination);
  }

  /**
   * Reset form and marker placements
   * @param inputForm {any} - input form
   * @param initCoordinates {any} - initial coordinates
   * @return none
   */
  private resetForm(inputForm: any, initCoordinates: any): void {
    inputForm.reset();
    this.responseMessages = undefined;
    this.markers = [];
    this.loaderMessage = "Requesting...";
    this.lat = initCoordinates.lat;
    this.lng = initCoordinates.lng;
  }

  /**
   * Process payload into response messages and markers
   * @method processResult
   * @param payload {Object} - response object containing marker coordinates and response messages
   * @return none
   */
  private processResult(payload: any): void {
    this.responseMessages = [{
      title: "Total distance",
      message: payload.total_distance
    }, {
      title: "Total time",
      message: payload.total_time
    }];

    for (let i = 0; i < payload.path.length; i++) {
      this.markers.push({
        lat: parseFloat(payload.path[i][0]),
        lng: parseFloat(payload.path[i][1]),
        label: (i + 1).toString()
      });
    }

    this.lat = this.markers[0].lat;
    this.lng = this.markers[0].lng;
  }

  /**
   * Toggle input display flag hide/show
   * @method toggleInputDisplay
   * @return none
   */
  private toggleInputDisplay(): void {
    this.hideInputTab = !this.hideInputTab;
  }
}