import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { Trophy, Mail, Award, Linkedin, Github, FileText, Camera, RotateCw, Crown, Users, ExternalLink, Trash2 } from 'lucide-react';
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
  // Get data from contexts
  const { user, profile, refreshProfile, loading: authLoading } = useAuth();
  const { role, isEBoard, stats } = useProfile();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  // Form states
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [classYear, setClassYear] = useState('');
  const [linkedinUsername, setLinkedinUsername] = useState('');
  const [githubUsername, setGithubUsername] = useState('');
  const [position, setPosition] = useState('');
  const [team, setTeam] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  // Image cropping states
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Populate form when profile loads
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name);
      setClassYear(profile.class_year || '');
      setLinkedinUsername(profile.linkedin_username || '');
      setGithubUsername(profile.github_username || '');
      setPosition(profile.position || '');
      setTeam(profile.team || '');
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

      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Error',
          description: 'Please select a valid image file',
          variant: 'destructive',
        });
        return;
      }

      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
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
      reader.onerror = () => {
        toast({
          title: 'Error',
          description: 'Failed to read the image file',
          variant: 'destructive',
        });
      };
      reader.readAsDataURL(file);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSaveCroppedImage = async () => {
    if (!imageSrc || !croppedAreaPixels || !user) return;

    try {
      setLoading(true);
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels, rotation);
      const croppedFile = new File([croppedBlob], 'profile.jpg', { type: 'image/jpeg' });

      const sanitizedName = fullName
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');

      const filePath = `${sanitizedName}_${user.id}/avatar.jpg`;

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

      const timestamp = Date.now();
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          profile_picture_url: `${publicUrl}?t=${timestamp}`
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

    const sanitizedName = fullName
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    const resumeName = fullName
      .split(' ')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join('_');

    const newFolderPath = `${sanitizedName}_${user.id}`;
    const fileName = `${resumeName}_resume.${fileExt}`;
    const filePath = `${newFolderPath}/${fileName}`;

    // Clean up old resume if name changed
    if (profile?.full_name && profile.full_name !== fullName) {
      const oldSanitizedName = profile.full_name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');

      const oldFolderPath = `${oldSanitizedName}_${user.id}`;

      const { data: oldFiles } = await supabase.storage
        .from('profiles')
        .list(oldFolderPath);

      if (oldFiles && oldFiles.length > 0) {
        const filesToDelete = oldFiles.map(file => `${oldFolderPath}/${file.name}`);
        await supabase.storage
          .from('profiles')
          .remove(filesToDelete);
      }
    }

    const { error: uploadError } = await supabase.storage
      .from('profiles')
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('profiles')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const deleteResume = async () => {
    if (!user || !profile?.resume_url) return;

    try {
      setLoading(true);

      // Extract file path from URL or construct it
      // The URL format is: https://[project].supabase.co/storage/v1/object/public/profiles/[filePath]
      const urlParts = profile.resume_url.split('/profiles/');
      let filePath: string | null = null;

      if (urlParts.length > 1) {
        // Extract path from URL (remove query params if any)
        filePath = urlParts[1].split('?')[0];
      } else {
        // Fallback: try to find resume file by listing folder
        const sanitizedName = (profile.full_name || fullName)
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '');
        const folderPath = `${sanitizedName}_${user.id}`;

        const { data: files } = await supabase.storage
          .from('profiles')
          .list(folderPath);

        if (files && files.length > 0) {
          const resumeFile = files.find(file => file.name.includes('_resume'));
          if (resumeFile) {
            filePath = `${folderPath}/${resumeFile.name}`;
          }
        }
      }

      // Delete from storage if we found the path
      if (filePath) {
        const { error: deleteError } = await supabase.storage
          .from('profiles')
          .remove([filePath]);

        if (deleteError) throw deleteError;
      }

      // Update profile to remove resume_url
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ resume_url: null })
        .eq('id', user.id);

      if (updateError) throw updateError;

      toast({
        title: 'Success',
        description: 'Resume deleted successfully!',
      });

      await refreshProfile();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete resume',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
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
        linkedin_username: linkedinUsername || null,
        github_username: githubUsername || null,
        position: position || null,
        team: isEBoard ? 'E-board' : (team || null), // ✅ Use isEBoard from ProfileContext
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

      // Check if there's a redirect URL stored (e.g., from check-in flow)
      const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
      if (redirectUrl) {
        sessionStorage.removeItem('redirectAfterLogin');
        navigate(redirectUrl, { replace: true });
      }
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

  const getRoleBadgeVariant = (roleValue: string | null): "default" | "secondary" | "outline" => {
    if (roleValue === 'e-board' || roleValue === 'board') return 'default';
    if (roleValue === 'member') return 'secondary';
    return 'outline';
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Show loading state
  if (authLoading || !user || !profile) {
    return (
      <div className={`min-h-full flex items-center justify-center ${isMobile ? 'p-4' : 'p-6'}`}>
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-muted-foreground">Loading profile...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`${isMobile ? 'p-4' : 'p-6'} min-h-full flex items-center justify-center`}>
      <div className="w-full max-w-6xl mx-auto">
        <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-3 justify-center'} items-center`}>
          {/* Left Column - Profile Overview */}
          <div className="lg:col-span-1">
            <Card className="flex flex-col">
              <CardHeader className="text-center pb-6">
                <div className="flex justify-center mb-4">
                  <div className="relative">
                    <Avatar className={`${isMobile ? 'h-24 w-24' : 'h-32 w-32'} border-4 border-background shadow-lg`}>
                      <AvatarImage src={profile.profile_picture_url || undefined} />
                      <AvatarFallback className="text-3xl">
                        {fullName ? getInitials(fullName) : user.email?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <label
                      htmlFor="avatar-upload"
                      className={`absolute bottom-0 right-0 bg-primary rounded-full cursor-pointer hover:bg-primary/90 transition-colors shadow-lg ${isMobile ? 'p-2' : 'p-2.5'}`}
                    >
                      <Camera className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-primary-foreground`} />
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
                  <div className="bg-card px-4 gap-2 flex flex-row">
                    {role && (
                      role === 'e-board' ? (
                        <Badge className="text-xs capitalize px-4 py-1.5 shrink-0 whitespace-nowrap sparkle gold-shimmer text-yellow-900 font-semibold border-2 border-yellow-400/50 relative">
                          <span className="sparkle-particle"></span>
                          <span className="sparkle-particle"></span>
                          <span className="sparkle-particle"></span>
                          <span className="relative z-10">{role.replace('-', ' ')}</span>
                        </Badge>
                      ) : (
                        <Badge
                          variant={getRoleBadgeVariant(role)}
                          className="text-xs capitalize px-4 py-1.5"
                        >
                          {role.replace('-', ' ')}
                        </Badge>
                      )
                    )}
                    <Badge variant="secondary" className="px-4 py-1.5 shrink-0 whitespace-nowrap bg-green-700 text-white font-semibold border-1 border-black">
                      {profile.term_joined || (() => {
                        const date = user.created_at ? new Date(user.created_at) : new Date();
                        return date.toLocaleString('en-US', { month: 'short', year: 'numeric' });
                      })()}
                    </Badge>
                  </div>
                </div>
              </div>

              <CardContent className="space-y-6 flex-1 flex flex-col justify-between">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-gradient-to-br from-yellow-500/10 to-primary/10 rounded-lg border text-center">
                    <Trophy className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mx-auto mb-2" />
                    <div className="text-xl font-bold">{profile.points}</div>
                    <div className="text-xs text-muted-foreground mt-1">Points</div>
                  </div>

                  <div className="p-4 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-lg border text-center">
                    <Award className="h-5 w-5 text-blue-600 dark:text-blue-500 mx-auto mb-2" />
                    <div className="text-xl font-bold capitalize truncate">
                      {classYear || 'Not set'}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Class Year</div>
                  </div>
                </div>

                {/* Activity Stats */}
                {stats && (
                  <div className="pt-4 border-t space-y-2">
                    <h4 className="text-sm font-semibold text-muted-foreground">Activity</h4>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <div className="text-lg font-bold">{stats.totalProjects}</div>
                        <div className="text-xs text-muted-foreground">Projects</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold">{stats.totalClasses}</div>
                        <div className="text-xs text-muted-foreground">Classes</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold">{stats.totalEventsAttended}</div>
                        <div className="text-xs text-muted-foreground">Events</div>
                      </div>
                    </div>
                  </div>
                )}
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
              <CardContent className={isMobile ? 'p-4' : ''}>
                <form onSubmit={handleSubmit} className={`space-y-6 ${isMobile ? 'space-y-4' : 'space-y-6'}`}>
                  <div className={`grid gap-6 ${isMobile ? 'grid-cols-1 gap-4' : 'grid-cols-1 md:grid-cols-2'}`}>
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

                  {role !== 'prospect' && (
                    <div className={`grid gap-6 ${isMobile ? 'grid-cols-1 gap-4' : 'grid-cols-1 md:grid-cols-2'}`}>
                      <div className="space-y-2">
                        <Label htmlFor="position">Position</Label>
                        <Input
                          id="position"
                          placeholder="e.g., Marketing Director"
                          value={position}
                          onChange={(e) => setPosition(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Your role or title in the club
                        </p>
                      </div>

                      {!isEBoard && (
                        <div className="space-y-2">
                          <Label htmlFor="team">Team</Label>
                          <Select value={team} onValueChange={setTeam} disabled={!position}>
                            <SelectTrigger>
                              <SelectValue placeholder={position ? "Select team" : "Add position first"} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Marketing">Marketing</SelectItem>
                              <SelectItem value="Events">Events</SelectItem>
                              <SelectItem value="Projects">Projects</SelectItem>
                              <SelectItem value="Social">Social</SelectItem>
                              <SelectItem value="Career">Career</SelectItem>
                              <SelectItem value="Courses">Courses</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            Only available if you have a position
                          </p>
                        </div>
                      )}
                      {isEBoard && (
                        <div className="space-y-2">
                          <Label>Team</Label>
                          <Input
                            value="E-board"
                            disabled
                            className="bg-muted"
                          />
                          <p className="text-xs text-muted-foreground">
                            E-board members are automatically assigned to the E-board team
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="linkedinUsername">
                      <div className="flex items-center gap-2">
                        <Linkedin className="h-4 w-4" />
                        LinkedIn Username
                      </div>
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        linkedin.com/in/
                      </span>
                      <Input
                        id="linkedinUsername"
                        value={linkedinUsername}
                        onChange={(e) => setLinkedinUsername(e.target.value)}
                        placeholder="yourprofile"
                        className="pl-[130px]"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="githubUsername">
                      <div className="flex items-center gap-2">
                        <Github className="h-4 w-4" />
                        GitHub Username
                      </div>
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        github.com/
                      </span>
                      <Input
                        id="githubUsername"
                        value={githubUsername}
                        onChange={(e) => setGithubUsername(e.target.value)}
                        placeholder="yourusername"
                        className="pl-[105px]"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="resume">Resume (PDF, DOC, or DOCX)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="resume"
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                        className={profile?.resume_url ? "flex-[4]" : "w-full"}
                      />
                      {profile?.resume_url && (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => window.open(profile.resume_url, '_blank')}
                            className="flex items-center gap-2 px-3"
                          >
                            <ExternalLink className="h-4 w-4" />
                            {isMobile ? null : "Resume"}
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            onClick={deleteResume}
                            disabled={loading}
                            className="px-3"
                            title="Delete resume"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
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
        <DialogContent className={`${isMobile ? 'max-w-[calc(100vw-2rem)]' : 'max-w-2xl'} rounded-xl`}>
          <DialogHeader>
            <DialogTitle className={isMobile ? 'text-lg' : ''}>Crop Profile Picture</DialogTitle>
          </DialogHeader>
          <div className={`space-y-4 ${isMobile ? 'space-y-3' : 'space-y-4'}`}>
            <div className={`relative bg-muted rounded-lg overflow-hidden ${isMobile ? 'h-64' : 'h-96'}`}>
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