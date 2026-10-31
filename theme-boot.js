try{var t=localStorage.getItem("theme")||"dark";document.documentElement.dataset.theme=t==="auto"?(matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"):t}catch(e){}
