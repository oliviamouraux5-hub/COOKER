'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { recipeSchema, type RecipeFormValues } from '@/lib/validations/recipe'
import { createRecipe } from '@/lib/actions/recipes'
import { uploadRecipeImage } from '@/lib/actions/storage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { ChefHat, Plus, Trash2, Upload, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

export default function NewRecipePage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  const { register, control, handleSubmit, formState: { errors }, watch, setValue } = useForm<RecipeFormValues>({
    resolver: zodResolver(recipeSchema),
    defaultValues: {
      title: '',
      ingredients: [{ item: '', qty: '' }],
      instructions: [''],
      is_public: false,
    }
  })

  const { fields: ingredientFields, append: appendIngredient, remove: removeIngredient } = useFieldArray({
    control,
    name: 'ingredients'
  })

  const { fields: instructionFields, append: appendInstruction, remove: removeInstruction } = useFieldArray({
    control,
    name: 'instructions' as any
  })

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
    }
  }

  const nextStep = () => setStep(s => s + 1)
  const prevStep = () => setStep(s => s - 1)

  async function onSubmit(data: RecipeFormValues) {
    setIsSubmitting(true)
    try {
      let image_url = ''
      if (imageFile) {
        const formData = new FormData()
        formData.append('image', imageFile)
        const uploadResult = await uploadRecipeImage(formData)
        if (uploadResult.error) {
          toast.error(uploadResult.error)
          return
        }
        image_url = uploadResult.url || ''
      }

      const result = await createRecipe({ ...data, image_url })
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Recipe created successfully!')
        router.push('/dashboard')
      }
    } catch (error) {
      toast.error('An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-12">
        <div className="flex items-center justify-between bg-white p-8 rounded-[2.5rem] shadow-premium">
          <div className="flex items-center gap-6">
            <Link href="/" className="p-3 bg-primary rounded-2xl shadow-lg shadow-primary/20 hover:rotate-6 transition-transform">
              <ChefHat className="text-white w-8 h-8" />
            </Link>
            <div className="h-12 w-px bg-muted hidden md:block" />
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-2xl">
                <ChefHat className="text-primary w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-foreground">Create <span className="text-primary">Recipe</span></h1>
                <p className="text-muted-foreground font-medium">Add your culinary masterpiece</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {[1, 2, 3].map(i => (
              <div 
                key={i} 
                className={`w-4 h-4 rounded-full transition-all duration-500 ${step === i ? 'w-10 bg-primary' : 'bg-primary/20'}`}
              />
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="animate-in fade-in slide-in-from-bottom-8 duration-700">
          {/* Step 1: Basic Info & Image */}
          {step === 1 && (
            <Card className="border-none shadow-premium bg-white p-4 rounded-[3rem]">
              <CardHeader className="p-8">
                <CardTitle className="text-2xl font-black">Basic Information</CardTitle>
                <CardDescription className="text-lg font-medium">Start with a catchy title and a mouth-watering photo.</CardDescription>
              </CardHeader>
              <CardContent className="px-8 pb-8 space-y-8">
                <div className="space-y-3">
                  <Label htmlFor="title" className="text-lg font-bold ml-2">Recipe Title</Label>
                  <Input 
                    id="title" 
                    placeholder="e.g. Grandma's Secret Pasta" 
                    {...register('title')}
                    className="h-16 bg-muted/50 border-none rounded-2xl px-6 text-lg font-medium focus:ring-2 focus:ring-primary/20"
                  />
                  {errors.title && <p className="text-sm text-red-500 ml-2 font-bold">{errors.title.message}</p>}
                </div>
                
                <div className="space-y-3">
                  <Label className="text-lg font-bold ml-2">Cover Photo</Label>
                  <div 
                    className="border-4 border-dashed border-primary/10 rounded-[2.5rem] p-12 flex flex-col items-center justify-center bg-muted/30 hover:bg-primary/5 transition-all cursor-pointer relative overflow-hidden group"
                    onClick={() => document.getElementById('image-upload')?.click()}
                  >
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    ) : (
                      <>
                        <div className="p-6 bg-white rounded-3xl shadow-premium mb-4 text-primary">
                          <Upload className="w-10 h-10" />
                        </div>
                        <p className="text-lg font-bold text-foreground">Click to upload photo</p>
                        <p className="text-sm text-muted-foreground font-medium">PNG, JPG up to 10MB</p>
                      </>
                    )}
                    <input 
                      id="image-upload" 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleImageChange}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-4 bg-muted/30 p-6 rounded-3xl">
                  <Checkbox 
                    id="is_public" 
                    onCheckedChange={(checked) => setValue('is_public', checked as boolean)}
                    className="w-6 h-6 rounded-lg border-primary data-[state=checked]:bg-primary"
                  />
                  <Label htmlFor="is_public" className="font-bold text-lg cursor-pointer">Make this recipe public</Label>
                </div>
              </CardContent>
              <CardFooter className="p-8 justify-end border-t border-muted">
                <Button type="button" onClick={nextStep} className="bg-primary hover:bg-primary/90 text-white h-16 px-10 text-lg rounded-2xl shadow-lg shadow-primary/10 font-black flex items-center justify-center">
                  Next Step <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* Step 2: Ingredients */}
          {step === 2 && (
            <Card className="border-none shadow-premium bg-white p-4 rounded-[3rem]">
              <CardHeader className="p-8">
                <CardTitle className="text-2xl font-black">Ingredients</CardTitle>
                <CardDescription className="text-lg font-medium">What goes into your masterpiece?</CardDescription>
              </CardHeader>
              <CardContent className="px-8 pb-8 space-y-6">
                <div className="space-y-4">
                  {ingredientFields.map((field, index) => (
                    <div key={field.id} className="flex gap-4 items-center animate-in fade-in slide-in-from-right duration-300">
                      <div className="flex-1">
                        <Input 
                          placeholder="Ingredient name" 
                          {...register(`ingredients.${index}.item` as any)}
                          className="h-14 bg-muted/50 border-none rounded-2xl px-6 font-medium"
                        />
                      </div>
                      <div className="w-32">
                        <Input 
                          placeholder="Qty" 
                          {...register(`ingredients.${index}.qty` as any)}
                          className="h-14 bg-muted/50 border-none rounded-2xl px-6 font-bold text-center"
                        />
                      </div>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon"
                        className="text-red-500 hover:bg-red-50 rounded-xl h-14 w-14"
                        onClick={() => removeIngredient(index)}
                      >
                        <Trash2 className="w-6 h-6" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full h-16 border-2 border-dashed border-primary/20 text-primary hover:bg-primary/5 rounded-2xl text-lg font-bold"
                  onClick={() => appendIngredient({ item: '', qty: '' })}
                >
                  <Plus className="w-5 h-5 mr-2" /> Add New Ingredient
                </Button>
              </CardContent>
              <CardFooter className="p-8 justify-between border-t border-muted">
                <Button type="button" variant="ghost" onClick={prevStep} className="px-8 h-16 text-lg font-bold rounded-2xl flex items-center justify-center">
                  <ChevronLeft className="w-5 h-5 mr-2" /> Back
                </Button>
                <Button type="button" onClick={nextStep} className="bg-primary hover:bg-primary/90 text-white h-16 px-10 text-lg rounded-2xl shadow-lg shadow-primary/10 font-black flex items-center justify-center">
                  Next Step <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* Step 3: Instructions */}
          {step === 3 && (
            <Card className="border-none shadow-premium bg-white p-4 rounded-[3rem]">
              <CardHeader className="p-8">
                <CardTitle className="text-2xl font-black">Cooking Instructions</CardTitle>
                <CardDescription className="text-lg font-medium">Guide us through the process, step by step.</CardDescription>
              </CardHeader>
              <CardContent className="px-8 pb-8 space-y-8">
                <div className="space-y-6">
                  {instructionFields.map((field, index) => (
                    <div key={field.id} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                      <div className="flex justify-between items-center">
                        <Label className="text-xl font-black text-primary ml-2">Step {index + 1}</Label>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm"
                          className="text-red-500 font-bold"
                          onClick={() => removeInstruction(index)}
                        >
                          Remove
                        </Button>
                      </div>
                      <Textarea 
                        placeholder="Describe this step in detail..." 
                        {...register(`instructions.${index}` as any)}
                        className="min-h-[120px] bg-muted/50 border-none rounded-[2rem] p-6 font-medium focus:ring-2 focus:ring-primary/20 resize-none"
                      />
                    </div>
                  ))}
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full h-16 border-2 border-dashed border-primary/20 text-primary hover:bg-primary/5 rounded-2xl text-lg font-bold"
                  onClick={() => appendInstruction('')}
                >
                  <Plus className="w-5 h-5 mr-2" /> Add Next Step
                </Button>
              </CardContent>
              <CardFooter className="p-8 justify-between border-t border-muted">
                <Button type="button" variant="ghost" onClick={prevStep} className="px-8 h-16 text-lg font-bold rounded-2xl flex items-center justify-center">
                  <ChevronLeft className="w-5 h-5 mr-2" /> Back
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="bg-primary hover:bg-primary/90 text-white h-16 px-12 text-lg rounded-2xl shadow-lg shadow-primary/10 font-black flex items-center justify-center animate-fade-in"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    "Finish & Save Recipe"
                  )}
                </Button>
              </CardFooter>
            </Card>
          )}
        </form>
      </div>
    </div>
  )
}
