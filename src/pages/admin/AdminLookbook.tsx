import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, GripVertical, Eye, EyeOff, Upload, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import {
  useLookbookItems,
  useCreateLookbookItem,
  useUpdateLookbookItem,
  useDeleteLookbookItem,
  useUploadLookbookImage,
  LookbookItem,
} from "@/hooks/useLookbookItems";

const categories = ["Business", "Casual", "Evening", "Streetwear", "Formal", "Athletic"];
const aspectRatios = [
  { value: "square", label: "Square (1:1)" },
  { value: "tall", label: "Portrait (3:4)" },
  { value: "wide", label: "Landscape (4:3)" },
];

interface LookbookFormData {
  title: string;
  description: string;
  category: string;
  aspect_ratio: string;
  image_url: string;
  sort_order: number;
  is_published: boolean;
}

const emptyForm: LookbookFormData = {
  title: "",
  description: "",
  category: "Casual",
  aspect_ratio: "square",
  image_url: "",
  sort_order: 0,
  is_published: true,
};

const AdminLookbook = () => {
  const navigate = useNavigate();
  const { data: items, isLoading } = useLookbookItems(true);
  const createItem = useCreateLookbookItem();
  const updateItem = useUpdateLookbookItem();
  const deleteItem = useDeleteLookbookItem();
  const uploadImage = useUploadLookbookImage();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LookbookItem | null>(null);
  const [formData, setFormData] = useState<LookbookFormData>(emptyForm);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<LookbookItem | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({
      ...emptyForm,
      sort_order: items?.length || 0,
    });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (item: LookbookItem) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      description: item.description || "",
      category: item.category,
      aspect_ratio: item.aspect_ratio,
      image_url: item.image_url,
      sort_order: item.sort_order,
      is_published: item.is_published,
    });
    setIsDialogOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const url = await uploadImage.mutateAsync(file);
      setFormData((prev) => ({ ...prev, image_url: url }));
      toast.success("Image uploaded successfully");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.image_url || !formData.category) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      if (editingItem) {
        await updateItem.mutateAsync({
          id: editingItem.id,
          ...formData,
        });
        toast.success("Lookbook item updated");
      } else {
        await createItem.mutateAsync(formData);
        toast.success("Lookbook item created");
      }
      setIsDialogOpen(false);
      setEditingItem(null);
      setFormData(emptyForm);
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save lookbook item");
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;

    try {
      await deleteItem.mutateAsync(itemToDelete.id);
      toast.success("Lookbook item deleted");
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete lookbook item");
    }
  };

  const handleTogglePublished = async (item: LookbookItem) => {
    try {
      await updateItem.mutateAsync({
        id: item.id,
        is_published: !item.is_published,
      });
      toast.success(item.is_published ? "Item unpublished" : "Item published");
    } catch (error) {
      console.error("Toggle error:", error);
      toast.error("Failed to update item");
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <section className="py-16 bg-background">
          <div className="container mx-auto px-6 lg:px-8">
            <Skeleton className="h-12 w-64 mb-8" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="aspect-square" />
              ))}
            </div>
          </div>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="py-16 bg-background">
        <div className="container mx-auto px-6 lg:px-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/dashboard")}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <div>
                <h1 className="font-serif text-3xl font-medium">Lookbook Manager</h1>
                <p className="text-muted-foreground font-sans text-sm">
                  Add, edit, and organize lookbook content
                </p>
              </div>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleOpenCreate} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Look
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>
                    {editingItem ? "Edit Lookbook Item" : "Add New Look"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Image Upload */}
                  <div>
                    <Label>Image *</Label>
                    <div className="mt-2">
                      {formData.image_url ? (
                        <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                          <img
                            src={formData.image_url}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                          <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                            <span className="text-white text-sm font-sans">Change Image</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                              className="hidden"
                              disabled={isUploading}
                            />
                          </label>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center aspect-video bg-muted rounded-lg border-2 border-dashed border-border cursor-pointer hover:border-primary/50 transition-colors">
                          <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                          <span className="text-sm text-muted-foreground">
                            {isUploading ? "Uploading..." : "Click to upload image"}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                            disabled={isUploading}
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Title */}
                  <div>
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, title: e.target.value }))
                      }
                      placeholder="e.g., Modern Power Suit"
                      className="mt-1"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, description: e.target.value }))
                      }
                      placeholder="Brief description of the look"
                      className="mt-1"
                      rows={2}
                    />
                  </div>

                  {/* Category & Aspect Ratio */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Category *</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) =>
                          setFormData((prev) => ({ ...prev, category: value }))
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Aspect Ratio</Label>
                      <Select
                        value={formData.aspect_ratio}
                        onValueChange={(value) =>
                          setFormData((prev) => ({ ...prev, aspect_ratio: value }))
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {aspectRatios.map((ratio) => (
                            <SelectItem key={ratio.value} value={ratio.value}>
                              {ratio.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Sort Order & Published */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Label htmlFor="sort_order">Sort Order</Label>
                      <Input
                        id="sort_order"
                        type="number"
                        value={formData.sort_order}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            sort_order: parseInt(e.target.value) || 0,
                          }))
                        }
                        className="w-20"
                        min={0}
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <Label htmlFor="is_published">Published</Label>
                      <Switch
                        id="is_published"
                        checked={formData.is_published}
                        onCheckedChange={(checked) =>
                          setFormData((prev) => ({ ...prev, is_published: checked }))
                        }
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={createItem.isPending || updateItem.isPending}
                    >
                      {editingItem ? "Save Changes" : "Add Look"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Items Grid */}
          {!items || items.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border rounded-lg">
              <p className="text-muted-foreground font-sans mb-4">
                No lookbook items yet. Add your first look to get started.
              </p>
              <Button onClick={handleOpenCreate} className="gap-2">
                <Plus className="w-4 h-4" />
                Add First Look
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {items.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="group relative bg-card border border-border overflow-hidden"
                >
                  {/* Image */}
                  <div
                    className={`relative ${
                      item.aspect_ratio === "tall"
                        ? "aspect-[3/4]"
                        : item.aspect_ratio === "wide"
                        ? "aspect-[4/3]"
                        : "aspect-square"
                    } overflow-hidden bg-muted`}
                  >
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Overlay with actions */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        size="icon"
                        variant="secondary"
                        onClick={() => handleOpenEdit(item)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="secondary"
                        onClick={() => handleTogglePublished(item)}
                      >
                        {item.is_published ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="destructive"
                        onClick={() => {
                          setItemToDelete(item);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Status badges */}
                    <div className="absolute top-2 left-2 flex gap-1">
                      {!item.is_published && (
                        <Badge variant="secondary" className="text-xs">
                          Draft
                        </Badge>
                      )}
                    </div>
                    <div className="absolute top-2 right-2">
                      <Badge variant="outline" className="text-xs bg-background/80">
                        #{item.sort_order}
                      </Badge>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <Badge variant="secondary" className="mb-2 text-xs">
                      {item.category}
                    </Badge>
                    <h3 className="font-serif font-medium truncate">{item.title}</h3>
                    {item.description && (
                      <p className="text-sm text-muted-foreground truncate">
                        {item.description}
                      </p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lookbook Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{itemToDelete?.title}"? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default AdminLookbook;
