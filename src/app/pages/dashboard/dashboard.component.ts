import { Component, OnInit } from "@angular/core";
import Chart from 'chart.js';
import { RestApiService } from 'src/app/rest/rest-api.service';
import { HttpParams } from '@angular/common/http';
import { formatDate, JsonPipe } from '@angular/common';
import {NgbModal, ModalDismissReasons} from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: "app-dashboard",
  templateUrl: "dashboard.component.html"
})
export class DashboardComponent implements OnInit {
  public canvas : any;
  public ctx;
  public datasets: any;
  public data: any;
  public myChartData;
  public clicked: boolean = true;
  public clicked1: boolean = false;
  public clicked2: boolean = false;
  public individualList: any;
  public groupList: any;
  public groupRankList: any = []
  public todayIndividualLeader: any;
  public todayGroupLeader: any;
  public OverallIndividualLeader: any;
  public OverallGroupLeader: any;
  public today:any = formatDate(new Date(), 'yyyy-MM-dd', 'en');
  public groupMembersDetails:any = {};
  public groupMembers:any;
  public groupName:any;

  public startDate = this.today;
  public endDate = this.today;
  public closeResult: string;

  constructor(private rest: RestApiService, private modalService: NgbModal) {}

  open(content) {
    this.modalService.open(content, {ariaLabelledBy: 'modal-basic-title'}).result.then((result) => {
      //this.closeResult = `Closed with: ${result}`;
    }, (reason) => {
      //this.closeResult = `Dismissed ${this.getDismissReason(reason)}`;
    });
  }

  sendData(data){
    this.groupName = data.group_name;
    //console.log("GOT: "+JSON.stringify(this.groupName))

    this.groupMembers = []
    this.groupMembers = this.groupMembersDetails[this.groupName];
    //console.log("Members: "+JSON.stringify(this.groupMembers))
  }

  setActive(buttonName){
    console.log("SetActive: "+ buttonName)

    if(buttonName == 'btn1'){
      this.startDate = this.today;
      this.endDate = this.today;
      console.log(this.startDate);
    }else{
      this.startDate = '2020-02-17';
      this.endDate = '2020-03-08';

    }

    this.groupList = []
    this.groupRankList  = []
    this.todayIndividualLeader = []
    this.todayGroupLeader = []
    this.individualList = []
    this.groupMembersDetails = {}
    this.groupMembers = []
    this.getIndividualScores();
    this.getGroupScores();
  }

  getIndividualScores(){
    // this.today = formatDate(new Date(), 'yyyy-MM-dd', 'en');
    //console.log("Date : "+this.today);

    const params = new HttpParams()
    .set('startDate', this.startDate)
    .set('endDate', this.endDate);

    this.rest.getIndividualSteps(params).subscribe((data: {}) => {
      //console.log('Mydata: ' + JSON.stringify(data));
      this.individualList = data['data']['rank_accounts'];
      //console.log("List: " + JSON.stringify(this.individualList));

      this.listMemberInGroup();

      this.getIndividualLeader();
    });
  }

  listMemberInGroup(){
    //map individual members to their group

    for(var person of this.individualList){
      var groupName = person.group_name;
      //console.log("Group: "+JSON.stringify(groupName));
      if (groupName in this.groupMembersDetails){
        var members = this.groupMembersDetails[groupName];
        //console.log("Group Members: "+JSON.stringify(members));
        if(person.info.display_name in members){
          //do nothing
          console.log("YOU SHOULDN'T BE HERE")
        }else{
          var member:any= {};
          member['name'] = person.info.display_name;
          member['steps'] = person.data_value;
          member['rank'] = parseInt(members.length)+1;
          member['redzone'] = false
          //console.log("New member: "+JSON.stringify(member));
          members.push(member);
          this.groupMembersDetails[groupName] = members;
          //console.log("Adding: "+JSON.stringify(this.groupMembersDetails))
        }
      }else{
        var newMember:any = {};
        var newMembers:any = [];
        newMember['name'] = person.info.display_name;
        newMember['steps'] = person.data_value;
        newMember['rank'] = 1
        newMember['redzone'] = false
        newMembers.push(newMember);
        //console.log("Member: "+JSON.stringify(newMembers))
        this.groupMembersDetails[groupName] = newMembers;
        //console.log("After Adding: "+JSON.stringify(this.groupMembersDetails))
      }
    }
    //console.log("All Groups: "+JSON.stringify(this.groupMembersDetails));
    this.calcRedzoneMembers();
  }


  calcRedzoneMembers(){
    for(var key in this.groupMembersDetails){
      var group = this.groupMembersDetails[key]
      var group_size = group.length
      if(group_size>0){
        if(group_size>1){
          var top = this.filterByString(group,1)[0];
          var thresholdSteps = 0.4*parseInt(top['steps'])
          console.log("Top : "+JSON.stringify(top))
          console.log("Threshold : "+thresholdSteps)
          //console.log("Group : "+JSON.stringify(group))
          for(var mem of group){
            if(mem['steps'] < thresholdSteps){
              mem['redzone'] = true
              console.log("Redzoned: "+JSON.stringify(mem))
              //filter group from groupranklist
              var redzonedGroup = this.groupRankList.filter(e => e.group_name == key)[0]
              redzonedGroup['redzone'] = true
              //console.log("Redzoned group: "+JSON.stringify)
            }
          }
        }
      }
    }
    //console.log("Groups: "+JSON.stringify(this.groupRankList))
  }


  getGroupScores(){
    // this.today = formatDate(new Date(), 'yyyy-MM-dd', 'en');
    // console.log("Date : "+this.today);

    const params = new HttpParams()
    .set('startDate', this.startDate)
    .set('endDate', this.endDate);

    this.rest.getGroupSteps(params).subscribe((data: {}) => {
      //console.log('Mydata: ' + JSON.stringify(data));
      this.groupList = data['data']['ranking_groups'];
      //console.log("List: " + JSON.stringify(this.groupList));

      var i=1;
      for(var item of this.groupList){
        var mem:any = {}
        mem['rank']=i;
        mem['group_name'] = item.info.display_name;
        mem['data_value'] = item.data_value;
        mem['user_count'] = item.info.user_count;
        mem['redzone'] = false
        if(item.info.user_count != 0){
          mem['avg_steps'] = +(item.data_value/item.info.user_count).toFixed(0);
        }else{
          mem['avg_steps'] = 0;
        }
        this.groupRankList.push(mem);
        i = i+1;
      }
      this.groupRankList = this.groupRankList.sort((a, b) => parseFloat(b.avg_steps) - parseFloat(a.avg_steps));
      i=1;
      for(var item of this.groupRankList){
        item.rank = i;
        i = i+1;
      }

      //console.log("Iterate : "+JSON.stringify(this.groupRankList));

      this.getGroupLeader();
    });
  }

  filterByString(data,rank) {
    return data.filter(e => e.rank == rank);
    }

  getIndividualLeader(){
   this.todayIndividualLeader = this.filterByString(this.individualList,1)
   //console.log("Today's Leader: "+JSON.stringify(this.todayIndividualLeader))
  }

  getGroupLeader(){
    this.todayGroupLeader = this.filterByString(this.groupRankList,1)
    //console.log("Today's lead group: "+JSON.stringify(this.todayGroupLeader))
  }


  ngOnInit() {
    this.getIndividualScores();
    this.getGroupScores();
    var gradientChartOptionsConfigurationWithTooltipBlue: any = {
      maintainAspectRatio: false,
      legend: {
        display: false
      },

      tooltips: {
        backgroundColor: '#f5f5f5',
        titleFontColor: '#333',
        bodyFontColor: '#666',
        bodySpacing: 4,
        xPadding: 12,
        mode: "nearest",
        intersect: 0,
        position: "nearest"
      },
      responsive: true,
      scales: {
        yAxes: [{
          barPercentage: 1.6,
          gridLines: {
            drawBorder: false,
            color: 'rgba(29,140,248,0.0)',
            zeroLineColor: "transparent",
          },
          ticks: {
            suggestedMin: 60,
            suggestedMax: 125,
            padding: 20,
            fontColor: "#2380f7"
          }
        }],

        xAxes: [{
          barPercentage: 1.6,
          gridLines: {
            drawBorder: false,
            color: 'rgba(29,140,248,0.1)',
            zeroLineColor: "transparent",
          },
          ticks: {
            padding: 20,
            fontColor: "#2380f7"
          }
        }]
      }
    };

    var gradientChartOptionsConfigurationWithTooltipPurple: any = {
      maintainAspectRatio: false,
      legend: {
        display: false
      },

      tooltips: {
        backgroundColor: '#f5f5f5',
        titleFontColor: '#333',
        bodyFontColor: '#666',
        bodySpacing: 4,
        xPadding: 12,
        mode: "nearest",
        intersect: 0,
        position: "nearest"
      },
      responsive: true,
      scales: {
        yAxes: [{
          barPercentage: 1.6,
          gridLines: {
            drawBorder: false,
            color: 'rgba(29,140,248,0.0)',
            zeroLineColor: "transparent",
          },
          ticks: {
            suggestedMin: 60,
            suggestedMax: 125,
            padding: 20,
            fontColor: "#9a9a9a"
          }
        }],

        xAxes: [{
          barPercentage: 1.6,
          gridLines: {
            drawBorder: false,
            color: 'rgba(225,78,202,0.1)',
            zeroLineColor: "transparent",
          },
          ticks: {
            padding: 20,
            fontColor: "#9a9a9a"
          }
        }]
      }
    };

    var gradientChartOptionsConfigurationWithTooltipRed: any = {
      maintainAspectRatio: false,
      legend: {
        display: false
      },

      tooltips: {
        backgroundColor: '#f5f5f5',
        titleFontColor: '#333',
        bodyFontColor: '#666',
        bodySpacing: 4,
        xPadding: 12,
        mode: "nearest",
        intersect: 0,
        position: "nearest"
      },
      responsive: true,
      scales: {
        yAxes: [{
          barPercentage: 1.6,
          gridLines: {
            drawBorder: false,
            color: 'rgba(29,140,248,0.0)',
            zeroLineColor: "transparent",
          },
          ticks: {
            suggestedMin: 60,
            suggestedMax: 125,
            padding: 20,
            fontColor: "#9a9a9a"
          }
        }],

        xAxes: [{
          barPercentage: 1.6,
          gridLines: {
            drawBorder: false,
            color: 'rgba(233,32,16,0.1)',
            zeroLineColor: "transparent",
          },
          ticks: {
            padding: 20,
            fontColor: "#9a9a9a"
          }
        }]
      }
    };

    var gradientChartOptionsConfigurationWithTooltipOrange: any = {
      maintainAspectRatio: false,
      legend: {
        display: false
      },

      tooltips: {
        backgroundColor: '#f5f5f5',
        titleFontColor: '#333',
        bodyFontColor: '#666',
        bodySpacing: 4,
        xPadding: 12,
        mode: "nearest",
        intersect: 0,
        position: "nearest"
      },
      responsive: true,
      scales: {
        yAxes: [{
          barPercentage: 1.6,
          gridLines: {
            drawBorder: false,
            color: 'rgba(29,140,248,0.0)',
            zeroLineColor: "transparent",
          },
          ticks: {
            suggestedMin: 50,
            suggestedMax: 110,
            padding: 20,
            fontColor: "#ff8a76"
          }
        }],

        xAxes: [{
          barPercentage: 1.6,
          gridLines: {
            drawBorder: false,
            color: 'rgba(220,53,69,0.1)',
            zeroLineColor: "transparent",
          },
          ticks: {
            padding: 20,
            fontColor: "#ff8a76"
          }
        }]
      }
    };

    var gradientChartOptionsConfigurationWithTooltipGreen: any = {
      maintainAspectRatio: false,
      legend: {
        display: false
      },

      tooltips: {
        backgroundColor: '#f5f5f5',
        titleFontColor: '#333',
        bodyFontColor: '#666',
        bodySpacing: 4,
        xPadding: 12,
        mode: "nearest",
        intersect: 0,
        position: "nearest"
      },
      responsive: true,
      scales: {
        yAxes: [{
          barPercentage: 1.6,
          gridLines: {
            drawBorder: false,
            color: 'rgba(29,140,248,0.0)',
            zeroLineColor: "transparent",
          },
          ticks: {
            suggestedMin: 50,
            suggestedMax: 125,
            padding: 20,
            fontColor: "#9e9e9e"
          }
        }],

        xAxes: [{
          barPercentage: 1.6,
          gridLines: {
            drawBorder: false,
            color: 'rgba(0,242,195,0.1)',
            zeroLineColor: "transparent",
          },
          ticks: {
            padding: 20,
            fontColor: "#9e9e9e"
          }
        }]
      }
    };


    var gradientBarChartConfiguration: any = {
      maintainAspectRatio: false,
      legend: {
        display: false
      },

      tooltips: {
        backgroundColor: '#f5f5f5',
        titleFontColor: '#333',
        bodyFontColor: '#666',
        bodySpacing: 4,
        xPadding: 12,
        mode: "nearest",
        intersect: 0,
        position: "nearest"
      },
      responsive: true,
      scales: {
        yAxes: [{

          gridLines: {
            drawBorder: false,
            color: 'rgba(29,140,248,0.1)',
            zeroLineColor: "transparent",
          },
          ticks: {
            suggestedMin: 60,
            suggestedMax: 120,
            padding: 20,
            fontColor: "#9e9e9e"
          }
        }],

        xAxes: [{

          gridLines: {
            drawBorder: false,
            color: 'rgba(29,140,248,0.1)',
            zeroLineColor: "transparent",
          },
          ticks: {
            padding: 20,
            fontColor: "#9e9e9e"
          }
        }]
      }
    };

    this.canvas = document.getElementById("chartLineRed");
    this.ctx = this.canvas.getContext("2d");

    var gradientStroke = this.ctx.createLinearGradient(0, 230, 0, 50);

    gradientStroke.addColorStop(1, 'rgba(233,32,16,0.2)');
    gradientStroke.addColorStop(0.4, 'rgba(233,32,16,0.0)');
    gradientStroke.addColorStop(0, 'rgba(233,32,16,0)'); //red colors

    var data = {
      labels: ['JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'],
      datasets: [{
        label: "Data",
        fill: true,
        backgroundColor: gradientStroke,
        borderColor: '#ec250d',
        borderWidth: 2,
        borderDash: [],
        borderDashOffset: 0.0,
        pointBackgroundColor: '#ec250d',
        pointBorderColor: 'rgba(255,255,255,0)',
        pointHoverBackgroundColor: '#ec250d',
        pointBorderWidth: 20,
        pointHoverRadius: 4,
        pointHoverBorderWidth: 15,
        pointRadius: 4,
        data: [80, 100, 70, 80, 120, 80],
      }]
    };

    var myChart = new Chart(this.ctx, {
      type: 'line',
      data: data,
      options: gradientChartOptionsConfigurationWithTooltipRed
    });


    this.canvas = document.getElementById("chartLineGreen");
    this.ctx = this.canvas.getContext("2d");


    var gradientStroke = this.ctx.createLinearGradient(0, 230, 0, 50);

    gradientStroke.addColorStop(1, 'rgba(66,134,121,0.15)');
    gradientStroke.addColorStop(0.4, 'rgba(66,134,121,0.0)'); //green colors
    gradientStroke.addColorStop(0, 'rgba(66,134,121,0)'); //green colors

    var data = {
      labels: ['JUL', 'AUG', 'SEP', 'OCT', 'NOV'],
      datasets: [{
        label: "My First dataset",
        fill: true,
        backgroundColor: gradientStroke,
        borderColor: '#00d6b4',
        borderWidth: 2,
        borderDash: [],
        borderDashOffset: 0.0,
        pointBackgroundColor: '#00d6b4',
        pointBorderColor: 'rgba(255,255,255,0)',
        pointHoverBackgroundColor: '#00d6b4',
        pointBorderWidth: 20,
        pointHoverRadius: 4,
        pointHoverBorderWidth: 15,
        pointRadius: 4,
        data: [90, 27, 60, 12, 80],
      }]
    };

    var myChart = new Chart(this.ctx, {
      type: 'line',
      data: data,
      options: gradientChartOptionsConfigurationWithTooltipGreen

    });



    var chart_labels = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    this.datasets = [
      [100, 70, 90, 70, 85, 60, 75, 60, 90, 80, 110, 100],
      [80, 120, 105, 110, 95, 105, 90, 100, 80, 95, 70, 120],
      [60, 80, 65, 130, 80, 105, 90, 130, 70, 115, 60, 130]
    ];
    this.data = this.datasets[0];



    this.canvas = document.getElementById("chartBig1");
    this.ctx = this.canvas.getContext("2d");

    var gradientStroke = this.ctx.createLinearGradient(0, 230, 0, 50);

    gradientStroke.addColorStop(1, 'rgba(233,32,16,0.2)');
    gradientStroke.addColorStop(0.4, 'rgba(233,32,16,0.0)');
    gradientStroke.addColorStop(0, 'rgba(233,32,16,0)'); //red colors

    var config = {
      type: 'line',
      data: {
        labels: chart_labels,
        datasets: [{
          label: "My First dataset",
          fill: true,
          backgroundColor: gradientStroke,
          borderColor: '#ec250d',
          borderWidth: 2,
          borderDash: [],
          borderDashOffset: 0.0,
          pointBackgroundColor: '#ec250d',
          pointBorderColor: 'rgba(255,255,255,0)',
          pointHoverBackgroundColor: '#ec250d',
          pointBorderWidth: 20,
          pointHoverRadius: 4,
          pointHoverBorderWidth: 15,
          pointRadius: 4,
          data: this.data,
        }]
      },
      options: gradientChartOptionsConfigurationWithTooltipRed
    };
    this.myChartData = new Chart(this.ctx, config);


    this.canvas = document.getElementById("CountryChart");
    this.ctx  = this.canvas.getContext("2d");
    var gradientStroke = this.ctx.createLinearGradient(0, 230, 0, 50);

    gradientStroke.addColorStop(1, 'rgba(29,140,248,0.2)');
    gradientStroke.addColorStop(0.4, 'rgba(29,140,248,0.0)');
    gradientStroke.addColorStop(0, 'rgba(29,140,248,0)'); //blue colors


    var myChart = new Chart(this.ctx, {
      type: 'bar',
      responsive: true,
      legend: {
        display: false
      },
      data: {
        labels: ['USA', 'GER', 'AUS', 'UK', 'RO', 'BR'],
        datasets: [{
          label: "Countries",
          fill: true,
          backgroundColor: gradientStroke,
          hoverBackgroundColor: gradientStroke,
          borderColor: '#1f8ef1',
          borderWidth: 2,
          borderDash: [],
          borderDashOffset: 0.0,
          data: [53, 20, 10, 80, 100, 45],
        }]
      },
      options: gradientBarChartConfiguration
    });

  }
  public updateOptions() {
    this.myChartData.data.datasets[0].data = this.data;
    this.myChartData.update();
  }
}
