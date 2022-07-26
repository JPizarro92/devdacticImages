import { Component, OnInit } from '@angular/core';
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { LoadingController, Platform } from '@ionic/angular';
import { safeCall } from '@ionic/core/dist/types/utils/overlays';
const IMAGE_DIR = 'stored-images';

interface LocalFile{
  name: string;
  path: string;
  data: string;
}

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {

  images: LocalFile[] = [];

  constructor(
    private platform: Platform,
    private loadingCtrl: LoadingController
  ) {}

  async ngOnInit() {
    this.loadFiles();
  }

  async loadFiles(){
    this.images = [];
    const loading = await this.loadingCtrl.create({ message: 'Loading data..',});
    await loading.present();
    Filesystem.readdir({ 
      directory: Directory.Data, 
      path: IMAGE_DIR
    }).then(result=>{
      console.log('Here: ', result);
      this.loadFileData(result.files);
    },async err => {
      await Filesystem.mkdir({ 
      directory: Directory.Data, 
      path: IMAGE_DIR });
    }).then(_ => { loading.dismiss(); })
  }

  async loadFileData(filesnames: string[]){
    for(let f of filesnames){
      const filePath = `${IMAGE_DIR}/${f}`;
      const readFile = await Filesystem.readFile({
        directory: Directory.Data,
        path: filePath
      });

      this.images.push({
        name: f,
        path: filePath,
        data: `data:image/jpeg;base64,${readFile.data}`
      })
    }
  }

  async startUpLoad(file: LocalFile){
    const response = await fetch(file.data);
    console.log("🚀 - file: Home Page startUpLoad", response);
    
  }

  async deleteImage(file: LocalFile){
    await Filesystem.deleteFile({
      directory: Directory.Data,
      path: file.path
    });
    this.loadFiles();
  }

  async selectImageCamera(){
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      //source: CameraSource.Photos
      source: CameraSource.Camera
    });
    if(image){
      this.saveImage(image);
    }
  }

  async selectImageGallery(){
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      source: CameraSource.Photos
    });
    if(image){
      this.saveImage(image);
    }
  }

  async saveImage(photo: Photo){
    const base64Data = await this.readAsBase64(photo);
    console.log(base64Data);
    const fileName = new Date().getTime()+'.jpeg';
    const savedFile = await Filesystem.writeFile({
      directory: Directory.Data,
      path: `${IMAGE_DIR}/${fileName}`,
      data: base64Data
    });
    console.log('saved: ', savedFile);
    this.loadFiles();
  }

  //Formato de carga a Base64
  async readAsBase64(photo: Photo){
    if(this.platform.is('hybrid')){
      const file = await Filesystem.readFile({ path: photo.path });
      return file.data;
    }else{
      const response = await fetch(photo.webPath);
      const blob = await response.blob();
      return await this.convertBlobToBase64(blob) as string;
    }
  }
  convertBlobToBase64 = (blob: Blob) => new Promise((resolver, reject) => {
    const reader = new FileReader;
    reader.onerror = reject;
    reader.onload = () => { resolver(reader.result); };
    reader.readAsDataURL(blob);
  });

}
