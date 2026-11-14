/* ---------- ekspor Excel (.xlsx dibuat langsung di perangkat) ---------- */
function crc32(u){let t=crc32.t;if(!t){t=crc32.t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}}let r=0xFFFFFFFF;for(let i=0;i<u.length;i++)r=t[(r^u[i])&255]^(r>>>8);return(r^0xFFFFFFFF)>>>0}
function zipStore(files){
  const enc=new TextEncoder(),u16=n=>[n&255,(n>>8)&255],u32=n=>[n&255,(n>>8)&255,(n>>16)&255,(n>>>24)&255],parts=[],cd=[];let off=0;
  for(const f of files){
    const nm=enc.encode(f.name),d=enc.encode(f.text),crc=crc32(d),sz=d.length;
    const lh=new Uint8Array([0x50,0x4b,3,4,...u16(20),...u16(0x0800),...u16(0),...u16(0),...u16(0x21),...u32(crc),...u32(sz),...u32(sz),...u16(nm.length),...u16(0),...nm]);
    cd.push(new Uint8Array([0x50,0x4b,1,2,...u16(20),...u16(20),...u16(0x0800),...u16(0),...u16(0),...u16(0x21),...u32(crc),...u32(sz),...u32(sz),...u16(nm.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(off),...nm]));
    parts.push(lh,d);off+=lh.length+sz;
  }
  const cdl=cd.reduce((a,x)=>a+x.length,0);
  return new Blob([...parts,...cd,new Uint8Array([0x50,0x4b,5,6,0,0,0,0,...u16(files.length),...u16(files.length),...u32(cdl),...u32(off),0,0])],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
}
function xlsxBuild(sheets,dec){
  const X=v=>String(v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const col=n=>{let s='';n++;while(n>0){const m=(n-1)%26;s=String.fromCharCode(65+m)+s;n=(n-m-1)/26}return s};
  const sheetXml=sh=>{
    const nr=sh.rows.length,nc=sh.rows.reduce((m,r)=>Math.max(m,r.length),0);
    const txt=c=>c==null?'':typeof c==='object'?(c.f?String(c.v==null?'':c.v):c.n!=null?String(c.n):String(c.t==null?'':c.t)):String(c);
    const widths=[];for(let i=0;i<nc;i++){let m=0;sh.rows.forEach((r,ri)=>{if(ri===0&&!sh.head&&r.length<2)return;const s=txt(r[i]);if(s.length>m)m=s.length});const base=(sh.w&&sh.w[i])||8;widths.push(Math.min(60,Math.max(base,Math.ceil(m*1.1)+3)))}
    const rows=sh.rows.map((r,ri)=>{
      const hd=sh.head&&ri===0,tot=sh.total&&ri===nr-1,multi=r.length>1;
      const cells=r.map((c,ci)=>{
        const ref=col(ci)+(ri+1);
        if(c==null||c===''){return(multi&&(hd||tot||sh.head||sh.grid))?`<c r="${ref}" s="${hd?1:tot?6:4}"/>`:''}
        if(typeof c==='object'){
          if(c.f||c.n!=null){const s=hd?1:c.d?10:c.diff?(tot?15:13):c.i?(tot?14:9):(tot?7:(c.f?3:2));
            return c.f?`<c r="${ref}" s="${s}"><f>${X(c.f)}</f><v>${c.v}</v></c>`:`<c r="${ref}" s="${s}"><v>${c.n}</v></c>`}
          if(c.in&&(c.t==null||c.t===''))return`<c r="${ref}" s="12"/>`;
          const s=hd?1:c.title?5:tot?6:c.b?8:c.c?11:4;
          return`<c r="${ref}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${X(c.t==null?'':c.t)}</t></is></c>`;
        }
        if(typeof c==='number')return`<c r="${ref}" s="${hd?1:tot?7:2}"><v>${c}</v></c>`;
        return`<c r="${ref}" s="${hd?1:tot?6:4}" t="inlineStr"><is><t xml:space="preserve">${X(c)}</t></is></c>`;
      }).join('');
      return`<row r="${ri+1}"${hd?' ht="26" customHeight="1"':''}>${cells}</row>`;
    }).join('');
    const last=nr-(sh.total?1:0),af=sh.head&&last>1&&nc>0?`<autoFilter ref="A1:${col(nc-1)}${last}"/>`:'';
    return`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><sheetViews><sheetView showGridLines="0" workbookViewId="0">${sh.head?'<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>':''}</sheetView></sheetViews><sheetFormatPr defaultRowHeight="18" customHeight="1"/><cols>${widths.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join('')}</cols><sheetData>${rows}</sheetData>${af}<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/><pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/></worksheet>`;
  };
  const nf=dec>0?'#,##0.'+'0'.repeat(dec):'#,##0';
  const dg=dec>0?'.'+'0'.repeat(dec):'';
  const bd=(c)=>`<left style="thin"><color rgb="${c}"/></left><right style="thin"><color rgb="${c}"/></right><top style="thin"><color rgb="${c}"/></top><bottom style="thin"><color rgb="${c}"/></bottom><diagonal/>`;
  const xf=(nf,font,fill,border,al)=>`<xf numFmtId="${nf}" fontId="${font}" fillId="${fill}" borderId="${border}" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"${al?' applyAlignment="1"><alignment '+al+'/></xf>':'/>'}`;
  const styles=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="3"><numFmt numFmtId="164" formatCode="${nf}"/><numFmt numFmtId="166" formatCode="dd mmm yyyy"/><numFmt numFmtId="167" formatCode="+#,##0${dg};[Red]\\-#,##0${dg};0"/></numFmts><fonts count="4"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="15"/><color rgb="FF1F3A5F"/><name val="Calibri"/></font></fonts><fills count="7"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEAF0FB"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1F3A5F"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFDCE7F8"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFF6D1"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF4F5F7"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="3"><border><left/><right/><top/><bottom/><diagonal/></border><border>${bd('FFD0D5DD')}</border><border><left style="thin"><color rgb="FFD0D5DD"/></left><right style="thin"><color rgb="FFD0D5DD"/></right><top style="medium"><color rgb="FF1F3A5F"/></top><bottom style="thin"><color rgb="FF1F3A5F"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="16">`+
    xf(0,0,0,0)+xf(0,2,3,1,'horizontal="center" vertical="center" wrapText="1"')+xf(164,0,0,1,'vertical="center"')+xf(164,0,0,1,'vertical="center"')+xf(0,0,0,1,'vertical="center"')+xf(0,3,0,0,'vertical="center"')+
    xf(0,1,4,2,'vertical="center"')+xf(164,1,4,2,'vertical="center"')+xf(0,1,2,1,'vertical="center"')+xf(3,0,0,1,'horizontal="center" vertical="center"')+xf(166,0,0,1,'horizontal="center" vertical="center"')+xf(0,0,0,1,'horizontal="center" vertical="center"')+xf(0,0,5,1)+xf(167,0,0,1,'horizontal="right" vertical="center"')+xf(3,1,4,2,'horizontal="center" vertical="center"')+xf(167,1,4,2,'horizontal="right" vertical="center"')+
    `</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  const H='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  const files=[
    {name:'[Content_Types].xml',text:H+'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'+sheets.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')+'</Types>'},
    {name:'_rels/.rels',text:H+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'},
    {name:'xl/workbook.xml',text:H+'<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'+sheets.map((sh,i)=>`<sheet name="${X(sh.name)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')+'</sheets></workbook>'},
    {name:'xl/_rels/workbook.xml.rels',text:H+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+sheets.map((_,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')+`<Relationship Id="rId${sheets.length+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`},
    {name:'xl/styles.xml',text:styles},
    ...sheets.map((sh,i)=>({name:`xl/worksheets/sheet${i+1}.xml`,text:sheetXml(sh)}))];
  return zipStore(files);
}
/* ---------- membaca .xlsx / .csv (stok opname) ---------- */
async function zipRead(buf){
  const dv=new DataView(buf),u=new Uint8Array(buf),td=new TextDecoder();let e=-1;
  for(let i=u.length-22;i>=Math.max(0,u.length-65558);i--){if(dv.getUint32(i,true)===0x06054b50){e=i;break}}
  if(e<0)throw new Error('bukan file xlsx');
  const n=dv.getUint16(e+10,true);let p=dv.getUint32(e+16,true);const ent={};
  for(let k=0;k<n;k++){
    if(dv.getUint32(p,true)!==0x02014b50)break;
    const meth=dv.getUint16(p+10,true),csz=dv.getUint32(p+20,true),nl=dv.getUint16(p+28,true),el=dv.getUint16(p+30,true),cl=dv.getUint16(p+32,true),lo=dv.getUint32(p+42,true);
    ent[td.decode(u.subarray(p+46,p+46+nl))]={meth,csz,lo};p+=46+nl+el+cl;
  }
  return async name=>{
    const f=ent[name];if(!f)return null;
    const s0=f.lo+30+dv.getUint16(f.lo+26,true)+dv.getUint16(f.lo+28,true),raw=u.subarray(s0,s0+f.csz);
    if(f.meth===0)return td.decode(raw);
    if(typeof DecompressionStream==='undefined')throw new Error('browser belum mendukung baca xlsx, simpan sebagai CSV');
    return td.decode(await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
  };
}
async function xlsxRead(buf){
  const get=await zipRead(buf),P=t=>new DOMParser().parseFromString(t,'application/xml');
  const wb=await get('xl/workbook.xml'),rel=await get('xl/_rels/workbook.xml.rels');let path='xl/worksheets/sheet1.xml';
  if(wb&&rel){const sh=P(wb).getElementsByTagName('sheet')[0],rid=sh&&(sh.getAttribute('r:id')||sh.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id'));
    const r=[...P(rel).getElementsByTagName('Relationship')].find(x=>x.getAttribute('Id')===rid);
    if(r){const t=r.getAttribute('Target');path=t[0]==='/'?t.slice(1):'xl/'+t}}
  const ss=await get('xl/sharedStrings.xml'),strs=ss?[...P(ss).getElementsByTagName('si')].map(si=>[...si.getElementsByTagName('t')].map(t=>t.textContent).join('')):[];
  const sx=await get(path);if(!sx)throw new Error('lembar tidak ditemukan');
  return [...P(sx).getElementsByTagName('row')].map(r=>{const row=[];
    [...r.getElementsByTagName('c')].forEach(c=>{
      let ci=0;for(const ch of (c.getAttribute('r')||'A').replace(/\d+/g,''))ci=ci*26+ch.charCodeAt(0)-64;ci--;
      const t=c.getAttribute('t');let v;
      if(t==='inlineStr')v=[...c.getElementsByTagName('t')].map(x=>x.textContent).join('');
      else{const ve=c.getElementsByTagName('v')[0];v=ve?ve.textContent:'';if(t==='s')v=strs[+v]||'';else if(t!=='str'&&t!=='b'&&t!=='e'&&v!==''&&!isNaN(v))v=+v}
      row[ci]=v});
    return row});
}
function csvRead(t){
  t=t.replace(/^﻿/,'');const first=t.split(/\r?\n/)[0]||'',d=[';','\t',','].map(x=>[x,first.split(x).length]).sort((a,b)=>b[1]-a[1])[0][0];
  const rows=[];let r=[],c='',q=false;
  for(let i=0;i<t.length;i++){const ch=t[i];
    if(q){if(ch==='"'){if(t[i+1]==='"'){c+='"';i++}else q=false}else c+=ch}
    else if(ch==='"')q=true;else if(ch===d){r.push(c);c=''}
    else if(ch==='\n'||ch==='\r'){if(ch==='\r'&&t[i+1]==='\n')i++;r.push(c);c='';rows.push(r);r=[]}
    else c+=ch}
  if(c!==''||r.length){r.push(c);rows.push(r)}
  return rows;
}
