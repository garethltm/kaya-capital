export type Space={name:string;type:'start'|'property'|'event'|'special';price?:number;group?:string};
export const BOARD:Space[]=[
{name:'MULA',type:'start'},{name:'Pasar Malam',type:'property',price:100,group:'Local'}, {name:'Malaysia Problems',type:'event'},{name:'Mamak',type:'property',price:120,group:'Local'},{name:'Balai',type:'special'},
{name:'Petaling Street',type:'property',price:180,group:'KL'}, {name:'Event',type:'event'}, {name:'Bangsar',type:'property',price:220,group:'KL'}, {name:'Roadblock',type:'special'}, {name:'KLCC',type:'property',price:450,group:'KL'},
{name:'Penang',type:'property',price:280,group:'North'}, {name:'Event',type:'event'}, {name:'Georgetown',type:'property',price:300,group:'North'}, {name:'Flash Flood',type:'event'}, {name:'Jonker Street',type:'property',price:260,group:'Melaka'},
{name:'Langkawi',type:'property',price:320,group:'Islands'}, {name:'Event',type:'event'}, {name:'Kota Kinabalu',type:'property',price:340,group:'Sabah'}, {name:'Roadblock',type:'special'}, {name:'Petronas Twin Towers',type:'property',price:500,group:'Icons'},
{name:'Merdeka 118',type:'property',price:550,group:'Icons'}, {name:'Event',type:'event'}, {name:'Kuching',type:'property',price:360,group:'Sarawak'}, {name:'Malaysia Problems',type:'event'}, {name:'Tutup Kedai',type:'special'}
];
