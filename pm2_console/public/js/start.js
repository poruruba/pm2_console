'use strict';

//const vConsole = new VConsole();
//const remoteConsole = new RemoteConsole("http://[remote server]/logio-post");
//window.datgui = new dat.GUI();

const PM2_URL_BASE = "";

var vue_options = {
    el: "#top",
    mixins: [mixins_bootstrap],
    store: vue_store,
    router: vue_router,
    data: {
        proc_list: [],
        proc_detail: null,

        log_pm2_name: "",
        log_pm2_id: 0,
        log_order: "tail",
        log_num: 100,
        log_content: "",
        log_type: "out",
    },
    computed: {
    },
    methods: {
        start_proc_view_log: function(pm2_id, pm2_name){
            this.log_pm2_name = pm2_name;
            this.log_pm2_id = pm2_id;
            this.log_content = "";
            this.dialog_open("#proc-log");
        },
        proc_view_log: async function(){
            var result = await do_post_text(PM2_URL_BASE + '/pm2-view-log', { pm2_id: this.log_pm2_id, type: this.log_type, order: this.log_order, num: this.log_num });
            this.log_content = result;
        },
        proc_get_log: async function(){
            var blob = await do_post_blob(PM2_URL_BASE + '/pm2-get-log', { pm2_id: this.log_pm2_id, type: this.log_type });
            console.log(blob);

            var url = window.URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.target = '_blank';
            a.download = "download.zip";
            a.click();
            window.URL.revokeObjectURL(url);
        },
        proc_list_update: async function(){
            var result = await do_post(PM2_URL_BASE + '/pm2-proc-list');
            console.log(result);
            this.proc_list = result.list;
        },
        proc_restart: async function(pm2_id){
            var result = await do_post(PM2_URL_BASE + '/pm2-proc-restart', { pm2_id: pm2_id });
            console.log(result);
            alert("再起動しました。");
            await this.proc_list_update();
        },
        proc_stop: async function(pm2_id){
            var result = await do_post(PM2_URL_BASE + '/pm2-proc-stop', { pm2_id: pm2_id });
            console.log(result);
            alert('停止しました。');
            await this.proc_list_update();
        },
        proc_describe: async function(pm2_id){
            var result = await do_post(PM2_URL_BASE + '/pm2-proc-describe', { pm2_id: pm2_id })
            console.log(result);
            this.proc_detail = result.desc;
            this.dialog_open('#proc-detail');
        },
    },
    created: function(){
    },
    mounted: function(){
        proc_load();

        this.proc_list_update();
    }
};
vue_add_data(vue_options, { progress_title: '' }); // for progress-dialog
vue_add_global_components(components_bootstrap);
vue_add_global_components(components_utils);

/* add additional components */
  
window.vue = new Vue( vue_options );

function do_post_text(url, body) {
    const headers = new Headers({ "Content-Type": "application/json" });
  
    return fetch(url, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: headers
    })
    .then((response) => {
      if (!response.ok)
        throw new Error('status is not 200');
//      return response.json();
      return response.text();
  //    return response.blob();
  //    return response.arrayBuffer();
    });
  }

function do_post_blob(url, body) {
    const headers = new Headers({ "Content-Type": "application/json" });

    return fetch(url, {
            method: 'POST',
            body: JSON.stringify(body),
            headers: headers
        })
        .then((response) => {
            if (!response.ok)
                throw 'status is not 200';
            //    return response.json();
            //    return response.text();
            return response.blob();
            //    return response.arrayBuffer();
    });
}
