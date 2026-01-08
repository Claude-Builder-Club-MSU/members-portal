import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Trophy, Mail, Award, Linkedin, FileText, Camera, RotateCw, Crown, Users } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Cropper from 'react-easy-crop';
import type { Database } from '@/integrations/supabase/database.types';

const Profile = () => {
  const { user, profile, role, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [classYear, setClassYear] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  // Image cropping states
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name);
      setClassYear(profile.class_year || '');
      setLinkedinUrl(profile.linkedin_url || '');
    }
  }, [profile]);

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', error => reject(error));
      image.src = url;
    });

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: any,
    rotation = 0
  ): Promise<Blob> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context');
    }

    const maxSize = Math.max(image.width, image.height);
    const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));

    canvas.width = safeArea;
    canvas.height = safeArea;

    ctx.translate(safeArea / 2, safeArea / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-safeArea / 2, -safeArea / 2);

    ctx.drawImage(
      image,
      safeArea / 2 - image.width * 0.5,
      safeArea / 2 - image.height * 0.5
    );

    const data = ctx.getImageData(0, 0, safeArea, safeArea);

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.putImageData(
      data,
      Math.round(0 - safeArea / 2 + image.width * 0.5 - pixelCrop.x),
      Math.round(0 - safeArea / 2 + image.height * 0.5 - pixelCrop.y)
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob!);
      }, 'image/jpeg');
    });
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];

      // Check if it's actually an image file
      if (!file.type.startsWith('image/')) {
        console.error("Selected file is not an image");
        toast({
          title: 'Error',
          description: 'Please select a valid image file',
          variant: 'destructive',
        });
        return;
      }

      // Check file size (limit to 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        console.error("File too large:", file.size);
        toast({
          title: 'Error',
          description: 'Image file is too large. Please select a file smaller than 10MB.',
          variant: 'destructive',
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        setImageSrc(reader.result as string);
        setShowCropModal(true);
      };
      reader.onerror = (error) => {
        console.error("FileReader error:", error);
        console.error("Error details:", reader.error);

        let errorMessage = 'Failed to read the image file';

        if (reader.error) {
          const errorName = reader.error.name;
          if (errorName === 'NotReadableError') {
            errorMessage = 'The image file could not be read. It may be corrupted or inaccessible. Please try a different image file.';
          } else if (errorName === 'NotFoundError') {
            errorMessage = 'The selected file could not be found.';
          } else if (errorName === 'SecurityError') {
            errorMessage = 'Security error: Cannot access the file due to browser restrictions.';
          }
        }

        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
      };
      reader.onabort = () => {
        console.log("FileReader aborted");
      };
      console.log("Starting to read file as data URL");
      reader.readAsDataURL(file);
      // Reset input value to allow selecting the same file again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } else {
      console.log("No files in target");
    }
  };

  const handleSaveCroppedImage = async () => {
    if (!imageSrc || !croppedAreaPixels || !user) return;

    try {
      setLoading(true);
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels, rotation);
      const croppedFile = new File([croppedBlob], 'profile.jpg', { type: 'image/jpeg' });

      // Add timestamp to filename to force cache refresh
      const timestamp = Date.now();
      const fileName = `${user.id}-${timestamp}.jpg`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(filePath, croppedFile, {
          upsert: true,
          contentType: 'image/jpeg'
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profiles')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          profile_picture_url: `${publicUrl}?t=${timestamp}` // Add timestamp to URL for cache busting
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      toast({
        title: 'Success',
        description: 'Profile picture updated!',
      });

      await refreshProfile();
      setShowCropModal(false);
      setImageSrc(null);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload image',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const uploadResume = async (file: File) => {
    if (!user) return null;

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}.${fileExt}`;
    const filePath = `resumes/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('profiles')
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('profiles')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let newResumeUrl = profile?.resume_url || null;

      if (resumeFile) {
        newResumeUrl = await uploadResume(resumeFile);
      }

      const updateData: Database['public']['Tables']['profiles']['Update'] = {
        full_name: fullName,
        class_year: classYear || null,
        linkedin_url: linkedinUrl || null,
        resume_url: newResumeUrl,
      };

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user!.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Profile updated successfully!',
      });

      await refreshProfile();
      setResumeFile(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeVariant = (roleValue: string) => {
    switch (roleValue) {
      case 'e-board':
        return 'default';
      case 'board':
        return 'secondary';
      case 'member':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getRoleIcon = (roleValue: string) => {
    switch (roleValue) {
      case 'e-board':
        return <Crown className="h-4 w-4" />;
      case 'board':
        return <Award className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (!user || !profile) {
    return (
      <div className="p-6 h-full flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Loading profile...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 h-[calc(100vh-3.5rem)] flex items-center justify-center overflow-auto">
      <div className="w-full max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Profile Overview */}
          <div className="lg:col-span-1">
            <Card className="h-full flex flex-col">
              <CardHeader className="text-center pb-6">
                <div className="flex justify-center mb-4">
                  <div className="relative">
                    <Avatar className="h-32 w-32 border-4 border-background shadow-lg">
                      <AvatarImage src={profile.profile_picture_url || undefined} />
                      <AvatarFallback className="text-3xl">
                        {fullName ? getInitials(fullName) : user.email?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <label
                      htmlFor="avatar-upload"
                      className="absolute bottom-0 right-0 p-2.5 bg-primary rounded-full cursor-pointer hover:bg-primary/90 transition-colors shadow-lg"
                    >
                      <Camera className="h-4 w-4 text-primary-foreground" />
                      <input
                        ref={fileInputRef}
                        id="avatar-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageSelect}
                      />
                    </label>
                  </div>
                </div>
                <CardTitle className="text-2xl">{fullName || 'No name set'}</CardTitle>
                <CardDescription className="flex items-center justify-center gap-1.5 mt-1">
                  <Mail className="h-3.5 w-3.5" />
                  {user.email}
                </CardDescription>
              </CardHeader>

              <div className="relative py-6">
                <div className="absolute inset-0 flex items-center px-6">
                  <div className="w-full border-t-2"></div>
                </div>
                <div className="relative flex justify-center">
                  <div className="bg-card px-4">
                    {role && (
                      <Badge variant={getRoleBadgeVariant(role)} className="capitalize px-4 py-1.5">
                        <span className="mr-1.5">{getRoleIcon(role)}</span>
                        {role.replace('-', ' ')}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <CardContent className="space-y-6 flex-1 flex flex-col justify-between">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 rounded-lg border text-center">
                    <Trophy className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold">{profile.points}</div>
                    <div className="text-xs text-muted-foreground mt-1">Points</div>
                  </div>

                  <div className="p-4 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-lg border text-center">
                    <Award className="h-5 w-5 text-blue-600 dark:text-blue-500 mx-auto mb-2" />
                    <div className="text-sm font-bold capitalize truncate">
                      {classYear || 'Not set'}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Class Year</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Edit Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Edit Profile</CardTitle>
                <CardDescription>Update your personal information</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name *</Label>
                      <Input
                        id="fullName"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="classYear">Class Year</Label>
                      <Select value={classYear} onValueChange={setClassYear}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select year" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="freshman">Freshman</SelectItem>
                          <SelectItem value="sophomore">Sophomore</SelectItem>
                          <SelectItem value="junior">Junior</SelectItem>
                          <SelectItem value="senior">Senior</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
                    <Input
                      id="linkedinUrl"
                      type="url"
                      value={linkedinUrl}
                      onChange={(e) => setLinkedinUrl(e.target.value)}
                      placeholder="https://linkedin.com/in/yourprofile"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="resume">Resume (PDF, DOC, or DOCX)</Label>
                    <Input
                      id="resume"
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                    />
                    {resumeFile && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        Selected: {resumeFile.name}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Uploading a new resume will replace your current one
                    </p>
                  </div>

                  <Button type="submit" disabled={loading} className="w-full" size="lg">
                    {loading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Image Crop Modal */}
      <Dialog open={showCropModal} onOpenChange={setShowCropModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Crop Profile Picture</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative h-96 bg-muted rounded-lg overflow-hidden">
              {imageSrc && (
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  rotation={rotation}
                  aspect={1}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onRotationChange={setRotation}
                  onCropComplete={onCropComplete}
                  cropShape="round"
                />
              )}
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Zoom</Label>
                <Slider
                  min={1}
                  max={3}
                  step={0.1}
                  value={[zoom]}
                  onValueChange={(value) => setZoom(value[0])}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <RotateCw className="h-4 w-4" />
                  Rotation
                </Label>
                <Slider
                  min={0}
                  max={360}
                  step={1}
                  value={[rotation]}
                  onValueChange={(value) => setRotation(value[0])}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCropModal(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSaveCroppedImage} disabled={loading}>
              {loading ? 'Saving...' : 'Save Picture'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;